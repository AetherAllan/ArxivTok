import {
  deleteAsync,
  documentDirectory,
  EncodingType,
  getInfoAsync,
  makeDirectoryAsync,
  moveAsync,
  writeAsStringAsync,
} from "expo-file-system/legacy";
import type { Paper } from "@/types/paper";
import type { OfflineHtmlEntry } from "./library";
import {
  collectCssResourceUrls,
  collectHtmlResourceUrls,
  contentHash,
  rewriteCssForOffline,
  rewriteHtmlForOffline,
} from "./offlineHtmlFormat";

const FORMAT_VERSION = 1;
const MAX_PACKAGE_BYTES = 50 * 1024 * 1024;
const MAX_RESOURCE_BYTES = 15 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 20_000;
const USER_AGENT = "ArxivTok/1.0 (Android; educational; contact: local-dev)";

type Resource = { bytes: Uint8Array; contentType: string };

function requireDocumentDirectory(): string {
  if (!documentDirectory) throw new Error("Document directory unavailable");
  return documentDirectory;
}

function safeName(value: string): string {
  return value.replace(/[^a-z0-9._-]+/gi, "_");
}

function extension(url: string, contentType: string): string {
  const fromPath = new URL(url).pathname.match(/(\.[a-z0-9]{1,8})$/i)?.[1];
  if (fromPath) return fromPath;
  if (contentType.includes("text/css")) return ".css";
  if (contentType.includes("image/png")) return ".png";
  if (contentType.includes("image/jpeg")) return ".jpg";
  if (contentType.includes("image/svg")) return ".svg";
  if (contentType.includes("image/webp")) return ".webp";
  return ".bin";
}

async function fetchResource(url: string, outerSignal?: AbortSignal): Promise<Resource> {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  outerSignal?.addEventListener("abort", onAbort, { once: true });
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
    const declared = Number(response.headers.get("content-length") ?? 0);
    if (declared > MAX_RESOURCE_BYTES) throw new Error("Offline resource exceeds 15 MB");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_RESOURCE_BYTES) throw new Error("Offline resource exceeds 15 MB");
    return {
      bytes,
      contentType: response.headers.get("content-type") ?? "application/octet-stream",
    };
  } finally {
    clearTimeout(timeout);
    outerSignal?.removeEventListener("abort", onAbort);
  }
}

function decodeText(bytes: Uint8Array): string {
  return new TextDecoder("utf-8").decode(bytes);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

async function writeBytes(uri: string, bytes: Uint8Array): Promise<void> {
  await writeAsStringAsync(uri, bytesToBase64(bytes), {
    encoding: EncodingType.Base64,
  });
}

export async function downloadOfflineHtml(
  paper: Paper,
  signal?: AbortSignal,
): Promise<OfflineHtmlEntry> {
  const root = `${requireDocumentDirectory()}OfflineHtml/`;
  const name = safeName(paper.arxivId);
  const finalDir = `${root}${name}/`;
  const tempDir = `${root}.${name}-${Date.now()}.tmp/`;
  const assetsDir = `${tempDir}assets/`;
  await makeDirectoryAsync(assetsDir, { intermediates: true });

  try {
    const pageUrl = `https://arxiv.org/html/${paper.arxivId}`;
    const htmlResource = await fetchResource(pageUrl, signal);
    let totalBytes = htmlResource.bytes.byteLength;
    const html = decodeText(htmlResource.bytes);
    const htmlUrls = collectHtmlResourceUrls(html, pageUrl);
    const stylesheetUrls = htmlUrls.filter((url) => /\.css(?:$|\?)/i.test(url));
    const fetched = new Map<string, Resource>();

    // Sequential downloads stay below the promised maximum of three and avoid
    // turning one offline action into an aggressive crawl of arXiv.
    for (const url of htmlUrls) {
      const resource = await fetchResource(url, signal);
      totalBytes += resource.bytes.byteLength;
      if (totalBytes > MAX_PACKAGE_BYTES) throw new Error("Offline package exceeds 50 MB");
      fetched.set(url, resource);
    }
    for (const stylesheetUrl of stylesheetUrls) {
      const css = decodeText(fetched.get(stylesheetUrl)?.bytes ?? new Uint8Array());
      for (const url of collectCssResourceUrls(css, stylesheetUrl)) {
        if (fetched.has(url)) continue;
        const resource = await fetchResource(url, signal);
        totalBytes += resource.bytes.byteLength;
        if (totalBytes > MAX_PACKAGE_BYTES) throw new Error("Offline package exceeds 50 MB");
        fetched.set(url, resource);
      }
    }

    const paths = new Map<string, string>();
    let index = 0;
    for (const [url, resource] of fetched) {
      paths.set(url, `assets/${index}${extension(url, resource.contentType)}`);
      index += 1;
    }
    for (const [url, resource] of fetched) {
      const relativePath = paths.get(url)!;
      const uri = `${tempDir}${relativePath}`;
      if (resource.contentType.includes("text/css")) {
        await writeAsStringAsync(
          uri,
          rewriteCssForOffline(decodeText(resource.bytes), url, paths),
        );
      } else {
        await writeBytes(uri, resource.bytes);
      }
    }

    const offlineHtml = rewriteHtmlForOffline(html, pageUrl, paths);
    await writeAsStringAsync(`${tempDir}index.html`, offlineHtml);
    const existing = await getInfoAsync(finalDir);
    if (existing.exists) await deleteAsync(finalDir, { idempotent: true });
    await moveAsync({ from: tempDir, to: finalDir });

    return {
      ...paper,
      entryUri: `${finalDir}index.html`,
      packageDir: finalDir,
      sourceHash: contentHash(html),
      byteSize: totalBytes,
      formatVersion: FORMAT_VERSION,
      downloadedAt: Date.now(),
    };
  } catch (error) {
    await deleteAsync(tempDir, { idempotent: true }).catch(() => undefined);
    throw error;
  }
}

export async function deleteOfflineHtmlPackage(
  entry: OfflineHtmlEntry,
): Promise<void> {
  await deleteAsync(entry.packageDir, { idempotent: true });
}
