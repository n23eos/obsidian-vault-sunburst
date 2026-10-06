import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Vault } from "obsidian";

vi.mock("obsidian", () => ({ TFile: class {}, TFolder: class {} }));

import { countVaultWords, type WordCacheEntry } from "../src/scan";

function scanFixture() {
  const file = { path: "note.md", stat: { mtime: 100 } };
  const cachedRead = vi.fn<(note: typeof file) => Promise<string>>();
  const vault = { getMarkdownFiles: () => [file], cachedRead } as unknown as Vault;
  return { file, cachedRead, vault, cache: new Map<string, WordCacheEntry>() };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("word scan recovery", () => {
  test("retries a failed read at the same mtime instead of caching zero words", async () => {
    const { vault, cachedRead, cache } = scanFixture();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    cachedRead.mockRejectedValueOnce(new Error("Temporary read failure"));
    cachedRead.mockResolvedValueOnce("three sample words");

    expect((await countVaultWords(vault, cache)).get("note.md")).toBe(0);
    expect((await countVaultWords(vault, cache)).get("note.md")).toBe(3);
  });

  test("retries a failed update without replacing a previously successful cache entry", async () => {
    const { vault, file, cachedRead, cache } = scanFixture();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    cachedRead.mockResolvedValueOnce("two words");
    await countVaultWords(vault, cache);
    file.stat.mtime = 200;
    cachedRead.mockRejectedValueOnce(new Error("Temporary read failure"));
    cachedRead.mockResolvedValueOnce("four new sample words");

    expect((await countVaultWords(vault, cache)).get("note.md")).toBe(0);
    expect((await countVaultWords(vault, cache)).get("note.md")).toBe(4);
  });

  test("keeps a successful zero-word read cached at unchanged mtime", async () => {
    const { vault, cachedRead, cache } = scanFixture();
    cachedRead.mockResolvedValueOnce("");
    cachedRead.mockResolvedValueOnce("must not reread");

    expect((await countVaultWords(vault, cache)).get("note.md")).toBe(0);
    expect((await countVaultWords(vault, cache)).get("note.md")).toBe(0);
  });

  test("continues counting other files after one read fails", async () => {
    const first = { path: "unreadable.md", stat: { mtime: 100 } };
    const second = { path: "readable.md", stat: { mtime: 100 } };
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const vault = {
      getMarkdownFiles: () => [first, second],
      cachedRead: async (file: typeof first) => {
        if (file.path === first.path) throw new Error("Temporary read failure");
        return "two words";
      },
    } as unknown as Vault;

    const result = await countVaultWords(vault, new Map());
    expect([...result]).toEqual([["unreadable.md", 0], ["readable.md", 2]]);
  });
});
