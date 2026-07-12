import { describe, expect, test } from "bun:test";
import {
  collectCssResourceUrls,
  collectHtmlResourceUrls,
  contentHash,
  rewriteCssForOffline,
  rewriteHtmlForOffline,
} from "./offlineHtmlFormat";

const BASE = "https://arxiv.org/html/1234.5678";

describe("offline HTML packaging", () => {
  test("collects only same-origin reading resources", () => {
    const html = `<link rel="stylesheet" href="/paper.css"><script src="/app.js"></script><img src="1234.5678/figure.png"><img src="https://tracker.example/x.png">`;
    expect(collectHtmlResourceUrls(html, BASE)).toEqual([
      "https://arxiv.org/paper.css",
      "https://arxiv.org/html/1234.5678/figure.png",
    ]);
  });

  test("rewrites local assets and removes executable or remote resources", () => {
    const cssUrl = "https://arxiv.org/paper.css";
    const imageUrl = "https://arxiv.org/html/1234.5678/figure.png";
    const paths = new Map([
      [cssUrl, "assets/0.css"],
      [imageUrl, "assets/1.png"],
    ]);
    const result = rewriteHtmlForOffline(
      `<html><head><link rel="stylesheet" href="/paper.css"><script>alert(1)</script></head><body><img src="1234.5678/figure.png"><img src="https://remote.example/x.png"></body></html>`,
      BASE,
      paths,
    );
    expect(result).toContain('href="assets/0.css"');
    expect(result).toContain('src="assets/1.png"');
    expect(result).not.toContain("alert(1)");
    expect(result).not.toContain("remote.example");
    expect(result).toContain("Content-Security-Policy");
  });

  test("rewrites CSS dependencies relative to the CSS file", () => {
    const font = "https://arxiv.org/fonts/main.woff2";
    expect(
      rewriteCssForOffline(
        `@font-face{src:url('/fonts/main.woff2')} .x{background:url(https://remote.example/a.png)}`,
        "https://arxiv.org/static/main.css",
        new Map([[font, "assets/2.woff2"]]),
      ),
    ).toBe(`@font-face{src:url('2.woff2')} .x{background:url(data:,)}`);
  });

  test("hash is stable and changes with the source", () => {
    expect(contentHash("paper")).toBe(contentHash("paper"));
    expect(contentHash("paper")).not.toBe(contentHash("paper!"));
  });

  test("collects same-origin CSS urls", () => {
    expect(
      collectCssResourceUrls(
        `.a{background:url('../images/a.png')} .b{src:url('https://fonts.example/a.woff')}`,
        "https://arxiv.org/static/css/main.css",
      ),
    ).toEqual(["https://arxiv.org/static/images/a.png"]);
  });
});
