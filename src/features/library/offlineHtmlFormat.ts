function attribute(tag: string, name: string): string | null {
  return tag.match(new RegExp(`\\b${name}=["']([^"']+)["']`, "i"))?.[1] ?? null;
}

function sameOriginUrl(value: string, baseUrl: string): string | null {
  if (!value || value.startsWith("data:") || value.startsWith("#")) return null;
  try {
    const url = new URL(value, baseUrl);
    return url.origin === new URL(baseUrl).origin ? url.toString() : null;
  } catch {
    return null;
  }
}

export function collectHtmlResourceUrls(html: string, baseUrl: string): string[] {
  const urls = new Set<string>();
  for (const match of html.matchAll(/<(?:img|source|link)\b[^>]*>/gi)) {
    const tag = match[0];
    const isStylesheet = /^<link\b/i.test(tag) && /\brel=["']stylesheet["']/i.test(tag);
    if (isStylesheet || /^<(?:img|source)\b/i.test(tag)) {
      const value = attribute(tag, isStylesheet ? "href" : "src");
      const resolved = value ? sameOriginUrl(value, baseUrl) : null;
      if (resolved) urls.add(resolved);
    }
    const srcset = attribute(tag, "srcset");
    for (const candidate of srcset?.split(",") ?? []) {
      const resolved = sameOriginUrl(candidate.trim().split(/\s+/)[0] ?? "", baseUrl);
      if (resolved) urls.add(resolved);
    }
  }
  return [...urls];
}

export function collectCssResourceUrls(css: string, baseUrl: string): string[] {
  const urls = new Set<string>();
  for (const match of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
    const resolved = sameOriginUrl(match[1], baseUrl);
    if (resolved) urls.add(resolved);
  }
  return [...urls];
}

function replaceAttribute(
  tag: string,
  name: string,
  baseUrl: string,
  paths: Map<string, string>,
): string {
  return tag.replace(
    new RegExp(`\\b${name}=(["'])([^"']+)\\1`, "i"),
    (_full, quote: string, value: string) => {
      const resolved = sameOriginUrl(value, baseUrl);
      return resolved && paths.has(resolved)
        ? `${name}=${quote}${paths.get(resolved)}${quote}`
        : "";
    },
  );
}

export function rewriteHtmlForOffline(
  html: string,
  baseUrl: string,
  paths: Map<string, string>,
): string {
  let output = html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "");
  output = output.replace(/<link\b[^>]*>/gi, (tag) => {
    if (!/\brel=["']stylesheet["']/i.test(tag)) return "";
    const href = attribute(tag, "href");
    const resolved = href ? sameOriginUrl(href, baseUrl) : null;
    return resolved && paths.has(resolved)
      ? replaceAttribute(tag, "href", baseUrl, paths)
      : "";
  });
  output = output.replace(/<(?:img|source)\b[^>]*>/gi, (tag) => {
    let next = replaceAttribute(tag, "src", baseUrl, paths);
    next = next.replace(/\bsrcset=(["'])([^"']+)\1/i, (_full, quote, value) => {
      const candidates = String(value)
        .split(",")
        .map((candidate) => {
          const [url, descriptor] = candidate.trim().split(/\s+/, 2);
          const resolved = sameOriginUrl(url ?? "", baseUrl);
          const local = resolved ? paths.get(resolved) : null;
          return local ? `${local}${descriptor ? ` ${descriptor}` : ""}` : null;
        })
        .filter(Boolean);
      return candidates.length > 0 ? `srcset=${quote}${candidates.join(", ")}${quote}` : "";
    });
    return next;
  });

  const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' data: file:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; script-src 'none'">`;
  return /<head\b[^>]*>/i.test(output)
    ? output.replace(/<head\b[^>]*>/i, (head) => `${head}${csp}`)
    : `${csp}${output}`;
}

export function rewriteCssForOffline(
  css: string,
  baseUrl: string,
  paths: Map<string, string>,
): string {
  return css.replace(
    /url\(\s*(["']?)([^"')]+)\1\s*\)/gi,
    (_full, quote: string, value: string) => {
      const resolved = sameOriginUrl(value, baseUrl);
      const local = resolved ? paths.get(resolved) : null;
      const fileName = local?.split("/").pop();
      return fileName ? `url(${quote}${fileName}${quote})` : "url(data:,)";
    },
  );
}

/** Stable non-cryptographic hash used only for cache invalidation. */
export function contentHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
