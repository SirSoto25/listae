import { describe, expect, it } from "vitest";

import { workSynopsis, workTitle } from "./work-text";

const work = {
  title: "Legacy",
  titleEs: "Título ES",
  titleEn: "Title EN",
  synopsis: "Old syn",
  synopsisEs: null,
  synopsisEn: "Syn EN",
};

describe("workTitle", () => {
  it("prefers locale field then en then legacy", () => {
    expect(workTitle(work, "es")).toBe("Título ES");
    expect(workTitle({ ...work, titleEs: null }, "es")).toBe("Title EN");
    expect(workTitle({ ...work, titleEs: null, titleEn: null }, "es")).toBe(
      "Legacy",
    );
  });
});

describe("workSynopsis", () => {
  it("prefers locale field then en then legacy", () => {
    expect(workSynopsis(work, "es")).toBe("Syn EN");
    expect(workSynopsis({ ...work, synopsisEn: null }, "es")).toBe("Old syn");
    expect(
      workSynopsis(
        { ...work, synopsisEs: "Sin ES", synopsisEn: null, synopsis: null },
        "es",
      ),
    ).toBe("Sin ES");
  });
});
