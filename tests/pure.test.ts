import { describe, expect, test } from "vitest";
import { arcColor } from "../src/color";
import { formatBytes, formatPercent } from "../src/format";
import { TAU, arcPath, clamp, easeInOutCubic } from "../src/geometry";
import { formatCount, pluralForm, resolveLocale, strings } from "../src/i18n";
import { computeLayout, metricValue, pathDepth } from "../src/layout";
import { collectArcs } from "../src/render";
import { makeExclusionFilter } from "../src/exclude";
import type { TreeNode } from "../src/types";
import { countWords } from "../src/words";

const file = (name: string, path: string, size: number, words = 0): TreeNode => ({
  name,
  path,
  isFolder: false,
  size,
  words,
  files: 1,
  children: [],
});

const folder = (name: string, path: string, children: TreeNode[]): TreeNode => ({
  name,
  path,
  isFolder: true,
  size: children.reduce((s, c) => s + c.size, 0),
  words: children.reduce((s, c) => s + c.words, 0),
  files: children.reduce((s, c) => s + c.files, 0),
  children,
});

describe("countWords", () => {
  test("counts plain russian and english words", () => {
    expect(countWords("Привет мир, hello world!")).toBe(4);
  });

  test("hyphenated and apostrophe words count as one", () => {
    expect(countWords("какой-то don't")).toBe(2);
  });

  test("returns zero for empty or symbol-only text", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("--- ### ***")).toBe(0);
  });

  test("CJK characters count individually, korean by spaces", () => {
    expect(countWords("你好世界")).toBe(4);
    expect(countWords("日本語のテキスト")).toBe(8);
    expect(countWords("안녕하세요 세계")).toBe(2);
    expect(countWords("mixed 中文 text")).toBe(4);
  });
});

describe("format", () => {
  const RU_UNITS = ["Б", "КБ", "МБ", "ГБ", "ТБ"];
  const EN_UNITS = ["B", "KB", "MB", "GB", "TB"];

  test("formats bytes with locale-aware separators and units", () => {
    expect(formatBytes(512, RU_UNITS, "ru")).toBe("512 Б");
    expect(formatBytes(1536, RU_UNITS, "ru")).toBe("1,5 КБ");
    expect(formatBytes(1536, EN_UNITS, "en")).toBe("1.5 KB");
    expect(formatBytes(5 * 1024 * 1024, RU_UNITS, "ru")).toBe("5 МБ");
  });

  test("percent edge cases", () => {
    expect(formatPercent(0, 0, "ru")).toBe("0%");
    expect(formatPercent(1, 1, "ru")).toBe("100%");
    expect(formatPercent(1, 10000, "ru")).toBe("<0,1%");
    expect(formatPercent(1, 8, "ru")).toBe("12,5%");
    expect(formatPercent(1, 8, "en")).toBe("12.5%");
  });
});

describe("i18n", () => {
  test("resolves obsidian language codes to supported locales", () => {
    expect(resolveLocale(null)).toBe("en");
    expect(resolveLocale("ru")).toBe("ru");
    expect(resolveLocale("pt-BR")).toBe("pt");
    expect(resolveLocale("zh-TW")).toBe("zh");
    expect(resolveLocale("xx")).toBe("en");
  });

  test("russian plural categories", () => {
    const word = strings("ru").word;
    expect(pluralForm("ru", 1, word)).toBe("слово");
    expect(pluralForm("ru", 3, word)).toBe("слова");
    expect(pluralForm("ru", 11, word)).toBe("слов");
    expect(pluralForm("ru", 25, word)).toBe("слов");
  });

  test("english and cjk counts", () => {
    expect(formatCount("en", 1, strings("en").file)).toBe("1 file");
    expect(formatCount("en", 2, strings("en").file)).toBe("2 files");
    expect(formatCount("zh", 3, strings("zh").file)).toBe("3个文件");
    expect(formatCount("ja", 5, strings("ja").word)).toBe("5文字");
  });

  test("every locale defines all plural forms it needs", () => {
    for (const code of ["en", "ru", "uk", "de", "fr", "es", "it", "pt", "pl", "tr", "zh", "ja", "ko"] as const) {
      const t = strings(code);
      for (const n of [1, 2, 5, 11, 21, 100]) {
        expect(pluralForm(code, n, t.word)).toBeTruthy();
        expect(pluralForm(code, n, t.file)).toBeTruthy();
        expect(pluralForm(code, n, t.smallItem)).toBeTruthy();
      }
      expect(t.byteUnits.length).toBe(5);
    }
  });
});

describe("makeExclusionFilter", () => {
  test("matches exact paths and nested children", () => {
    const excluded = makeExclusionFilter(["attachments", "/daily/"]);
    expect(excluded("attachments")).toBe(true);
    expect(excluded("attachments/img.png")).toBe(true);
    expect(excluded("daily/2026.md")).toBe(true);
    expect(excluded("notes/attachments.md")).toBe(false);
  });

  test("empty settings exclude nothing", () => {
    const excluded = makeExclusionFilter(["", "  "]);
    expect(excluded("anything")).toBe(false);
  });
});

describe("geometry", () => {
  test("clamp and easing bounds", () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
  });

  test("arcPath returns empty for degenerate sectors", () => {
    expect(arcPath(0, 0, 10, 20)).toBe("");
    expect(arcPath(0, 1, 20, 10)).toBe("");
  });

  test("arcPath builds a sector with two arcs", () => {
    const d = arcPath(0, Math.PI / 2, 50, 100, 1);
    expect(d.startsWith("M ")).toBe(true);
    expect(d.match(/A /g)?.length).toBe(2);
    expect(d.endsWith("Z")).toBe(true);
  });

  test("full circle renders as double annulus path", () => {
    const d = arcPath(0, TAU, 50, 100);
    expect(d.match(/M /g)?.length).toBe(2);
  });
});

describe("color", () => {
  test("returns valid hsl and fades with depth", () => {
    const c1 = arcColor(0.25, 1, false);
    const c5 = arcColor(0.25, 5, false);
    expect(c1).toMatch(/^hsl\(\d+ \d+% \d+(\.\d+)?%\)$/);
    const sat = (c: string) => Number(c.split(" ")[1].replace("%", ""));
    expect(sat(c5)).toBeLessThan(sat(c1));
  });
});

describe("computeLayout", () => {
  const tree = folder("root", "/", [
    folder("a", "a", [file("a1.md", "a/a1.md", 300, 30), file("a2.md", "a/a2.md", 100, 10)]),
    file("b.md", "b.md", 600, 0),
  ]);

  test("angles are proportional to metric and cover the full circle", () => {
    const layout = computeLayout(tree, "size");
    expect(layout.total).toBe(1000);
    expect(layout.angles.get("/")).toEqual({ x0: 0, x1: 1 });
    const b = layout.angles.get("b.md")!;
    expect(b.x1 - b.x0).toBeCloseTo(0.6);
    const a = layout.angles.get("a")!;
    expect(a.x1 - a.x0).toBeCloseTo(0.4);
  });

  test("children are sorted descending by value", () => {
    const layout = computeLayout(tree, "size");
    const kids = layout.order.get("/")!;
    expect(kids.map((k) => k.path)).toEqual(["b.md", "a"]);
  });

  test("zero-value nodes are excluded in words metric", () => {
    const layout = computeLayout(tree, "words");
    expect(layout.total).toBe(40);
    expect(layout.angles.has("b.md")).toBe(false);
    const a = layout.angles.get("a")!;
    expect(a.x1 - a.x0).toBeCloseTo(1);
  });

  test("empty tree produces empty layout", () => {
    const layout = computeLayout(folder("root", "/", []), "size");
    expect(layout.total).toBe(0);
    expect(layout.angles.size).toBe(0);
  });

  test("metricValue picks the right field", () => {
    expect(metricValue(tree, "size")).toBe(1000);
    expect(metricValue(tree, "words")).toBe(40);
    expect(metricValue(tree, "files")).toBe(3);
  });

  test("files metric splits by file count", () => {
    const layout = computeLayout(tree, "files");
    expect(layout.total).toBe(3);
    const a = layout.angles.get("a")!;
    expect(a.x1 - a.x0).toBeCloseTo(2 / 3);
  });
});

describe("pathDepth", () => {
  test("root and nested depths", () => {
    expect(pathDepth("/")).toBe(0);
    expect(pathDepth("a")).toBe(1);
    expect(pathDepth("a/b/c")).toBe(3);
  });
});

describe("collectArcs", () => {
  const tiny = Array.from({ length: 20 }, (_, i) => file(`t${i}.md`, `t/t${i}.md`, 1));
  const tree = folder("root", "/", [
    folder("big", "big", [file("x.md", "big/x.md", 5000)]),
    folder("t", "t", tiny),
  ]);
  const layout = computeLayout(tree, "size");
  const fullView = { x0: 0, x1: 1, depth: 0 };
  const valueOf = (n: TreeNode) => n.size;
  const angleOf = (p: string) => layout.angles.get(p);

  test("renders visible arcs and merges tiny tail into rest", () => {
    const arcs = collectArcs(tree, layout.order, angleOf, fullView, valueOf);
    const keys = arcs.map((a) => a.key);
    expect(keys).toContain("big");
    expect(keys).toContain("big/x.md");
    expect(keys).toContain("t");
    // 20 files of 1 byte each inside a 5020-byte circle → each < MIN span → one rest arc
    const rest = arcs.find((a) => a.key === "t::rest");
    expect(rest).toBeDefined();
    expect(rest!.restCount).toBe(20);
    expect(rest!.restValue).toBe(20);
    expect(keys).not.toContain("t/t0.md");
  });

  test("zoomed view expands tiny files into real arcs", () => {
    const t = layout.angles.get("t")!;
    const zoomed = { x0: t.x0, x1: t.x1, depth: 1 };
    const arcs = collectArcs(tree, layout.order, angleOf, zoomed, valueOf);
    const keys = arcs.map((a) => a.key);
    expect(keys).toContain("t/t0.md");
    expect(keys).not.toContain("t::rest");
    // Sibling subtree is outside the window
    expect(keys).not.toContain("big/x.md");
  });

  test("rings deeper than the limit are not emitted", () => {
    const deep = folder("root", "/", [
      folder("l1", "l1", [
        folder("l2", "l1/l2", [
          folder("l3", "l1/l2/l3", [
            folder("l4", "l1/l2/l3/l4", [
              folder("l5", "l1/l2/l3/l4/l5", [
                folder("l6", "l1/l2/l3/l4/l5/l6", [
                  file("deep.md", "l1/l2/l3/l4/l5/l6/deep.md", 100),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    ]);
    const deepLayout = computeLayout(deep, "size");
    const arcs = collectArcs(
      deep,
      deepLayout.order,
      (p) => deepLayout.angles.get(p),
      fullView,
      valueOf,
    );
    const maxRing = Math.max(...arcs.map((a) => a.ring));
    expect(maxRing).toBeLessThanOrEqual(6);
    expect(arcs.map((a) => a.key)).not.toContain("l1/l2/l3/l4/l5/l6/deep.md");
  });
});
