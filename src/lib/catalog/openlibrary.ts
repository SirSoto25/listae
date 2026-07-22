import type { WorkType } from "@/types/domain";

import type { CatalogHit } from "./types";

const OPEN_LIBRARY_SEARCH_URL = "https://openlibrary.org/search.json";
const OPEN_LIBRARY_COVER_URL = "https://covers.openlibrary.org/b/id";

type OpenLibraryDocument = {
  key?: string;
  title?: string;
  first_publish_year?: number;
  cover_i?: number;
  subject?: string[];
};

type OpenLibraryWork = {
  title?: string;
  first_publish_date?: string;
  covers?: number[];
  subjects?: string[];
};

type OpenLibraryResponse = {
  docs?: OpenLibraryDocument[];
};

function inferType(
  document: OpenLibraryDocument,
  requestedType: WorkType | "all",
): "book" | "manga" | "comic" {
  if (
    requestedType === "book" ||
    requestedType === "manga" ||
    requestedType === "comic"
  ) {
    return requestedType;
  }

  const subjects = (document.subject ?? []).map((subject) =>
    subject.toLocaleLowerCase(),
  );
  if (subjects.some((subject) => subject.includes("manga"))) {
    return "manga";
  }
  if (
    subjects.some(
      (subject) =>
        subject.includes("comic") || subject.includes("graphic novel"),
    )
  ) {
    return "comic";
  }
  return "book";
}

export async function searchOpenLibrary(
  query: string,
  typeFilter: WorkType | "all",
): Promise<CatalogHit[]> {
  if (!["all", "book", "manga", "comic"].includes(typeFilter)) {
    return [];
  }

  const url = new URL(OPEN_LIBRARY_SEARCH_URL);
  url.searchParams.set("q", query);
  url.searchParams.set(
    "fields",
    "key,title,first_publish_year,cover_i,subject",
  );
  url.searchParams.set("limit", "20");

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(
      `Open Library search failed with status ${response.status}`,
    );
  }

  const data = (await response.json()) as OpenLibraryResponse;
  return (data.docs ?? []).flatMap((document): CatalogHit[] => {
    if (!document.key || !document.title) {
      return [];
    }

    return [
      {
        source: "openlibrary",
        externalId: document.key.replace(/^\/works\//, ""),
        type: inferType(document, typeFilter),
        title: document.title,
        ...(document.first_publish_year === undefined
          ? {}
          : { year: document.first_publish_year }),
        ...(document.cover_i === undefined
          ? {}
          : {
              coverUrl: `${OPEN_LIBRARY_COVER_URL}/${document.cover_i}-M.jpg`,
            }),
      },
    ];
  });
}

export async function resolveOpenLibrary(
  externalId: string,
): Promise<CatalogHit> {
  if (!/^OL\d+W$/.test(externalId)) {
    throw new Error("invalid Open Library identity");
  }

  const response = await fetch(
    `https://openlibrary.org/works/${externalId}.json`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error(
      `Open Library lookup failed with status ${response.status}`,
    );
  }

  const work = (await response.json()) as OpenLibraryWork;
  if (!work.title) {
    throw new Error("Open Library record is invalid");
  }

  const year = work.first_publish_date
    ? Number.parseInt(work.first_publish_date.slice(0, 4), 10)
    : undefined;
  const cover = work.covers?.find((id) => id > 0);

  return {
    source: "openlibrary",
    externalId,
    type: inferType({ subject: work.subjects }, "all"),
    title: work.title,
    ...(Number.isInteger(year) ? { year } : {}),
    ...(cover === undefined
      ? {}
      : { coverUrl: `${OPEN_LIBRARY_COVER_URL}/${cover}-M.jpg` }),
  };
}
