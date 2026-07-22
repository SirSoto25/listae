import { describe, expect, it } from "vitest";

import { normalizeEntryInput, parseScore } from "./entries";

describe("parseScore", () => {
  it.each(["", null, undefined])("returns null for %s", (raw) => {
    expect(parseScore(raw)).toBeNull();
  });

  it.each([1, "7", 10])("accepts integer scores from 1 to 10", (raw) => {
    expect(parseScore(raw)).toBe(Number(raw));
  });

  it.each([0, 11, 1.5, "not-a-score"])("rejects invalid scores", (raw) => {
    expect(() => parseScore(raw)).toThrow("score must be 1-10");
  });
});

describe("normalizeEntryInput", () => {
  it("uses episode progress for anime and series", () => {
    expect(
      normalizeEntryInput("anime", {
        status: "in_progress",
        score: "8",
        progressValue: "4",
      }),
    ).toMatchObject({
      status: "in_progress",
      score: 8,
      progressValue: 4,
      progressUnit: "episodes",
    });
  });

  it("removes numeric progress from movies", () => {
    expect(
      normalizeEntryInput("movie", {
        status: "completed",
        score: "",
        progressValue: "99",
        progressUnit: "pages",
      }),
    ).toMatchObject({
      score: null,
      progressValue: 0,
      progressUnit: null,
    });
  });

  it.each(["book", "manga", "comic"] as const)(
    "accepts chapter or page progress for %s",
    (type) => {
      expect(
        normalizeEntryInput(type, {
          status: "plan",
          progressValue: "12",
          progressUnit: "pages",
        }),
      ).toMatchObject({
        progressValue: 12,
        progressUnit: "pages",
      });
    },
  );

  it("rejects negative or fractional progress", () => {
    expect(() =>
      normalizeEntryInput("series", {
        status: "in_progress",
        progressValue: "-1",
      }),
    ).toThrow("progress must be a non-negative integer");
    expect(() =>
      normalizeEntryInput("book", {
        status: "in_progress",
        progressValue: "1.5",
        progressUnit: "chapters",
      }),
    ).toThrow("progress must be a non-negative integer");
  });

  it("rejects invalid reading progress units", () => {
    expect(() =>
      normalizeEntryInput("book", {
        status: "in_progress",
        progressValue: "1",
        progressUnit: "episodes",
      }),
    ).toThrow("progress unit must be chapters or pages");
  });

  it("enforces the total for the selected progress unit", () => {
    const totals = { chaptersTotal: 12, pagesTotal: 300 };

    expect(() =>
      normalizeEntryInput(
        "book",
        {
          status: "in_progress",
          progressValue: "13",
          progressUnit: "chapters",
        },
        totals,
      ),
    ).toThrow("progress cannot exceed 12 chapters");
    expect(
      normalizeEntryInput(
        "book",
        {
          status: "in_progress",
          progressValue: "13",
          progressUnit: "pages",
        },
        totals,
      ),
    ).toMatchObject({ progressValue: 13, progressUnit: "pages" });
  });
});
