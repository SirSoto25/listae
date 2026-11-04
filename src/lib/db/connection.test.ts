import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { openDatabase } from "./connection";

describe("openDatabase", () => {
  it("enables WAL, busy timeout and foreign keys on file databases", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "listae-db-"));
    const sqlite = openDatabase(path.join(dir, "nested", "t.db"));
    try {
      expect(sqlite.pragma("journal_mode", { simple: true })).toBe("wal");
      expect(sqlite.pragma("busy_timeout", { simple: true })).toBe(5000);
      expect(sqlite.pragma("synchronous", { simple: true })).toBe(1); // NORMAL
      expect(sqlite.pragma("foreign_keys", { simple: true })).toBe(1);
    } finally {
      sqlite.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("opens in-memory databases with foreign keys on", () => {
    const sqlite = openDatabase(":memory:");
    expect(sqlite.pragma("foreign_keys", { simple: true })).toBe(1);
    sqlite.close();
  });
});
