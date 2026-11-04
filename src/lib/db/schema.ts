import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  unique,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import {
  EXTERNAL_SOURCES,
  LIST_STATUSES,
  PROGRESS_UNITS,
  WORK_TYPES,
} from "@/types/domain";

/**
 * `('a', 'b', …)` for a CHECK. The values are code constants from
 * `@/types/domain`, never user input, so inlining them with `sql.raw` is safe.
 */
function sqlList(values: readonly string[]) {
  return sql.raw(`(${values.map((value) => `'${value}'`).join(", ")})`);
}

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name"),
    email: text("email").notNull(),
    emailVerified: integer("email_verified", { mode: "timestamp" }),
    image: text("image"),
    username: text("username"),
    displayName: text("display_name"),
    profileLocale: text("profile_locale", { enum: ["es", "en"] })
      .notNull()
      .default("es"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    unique("users_email_unique").on(table.email),
    unique("users_username_unique").on(table.username),
    check(
      "users_profile_locale_check",
      sql`${table.profileLocale} in ('es', 'en')`,
    ),
  ],
);

export const accounts = sqliteTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerAccountId] }),
  ],
);

export const sessions = sqliteTable(
  "sessions",
  {
    sessionToken: text("session_token").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: integer("expires", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export const verificationTokens = sqliteTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.identifier, table.token] }),
    index("verification_tokens_expires_idx").on(table.expires),
  ],
);

export const profileThemes = sqliteTable(
  "profile_themes",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    htmlTemplate: text("html_template").notNull(),
    customCss: text("custom_css").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    unique("profile_themes_user_id_unique").on(table.userId),
  ],
);

export const works = sqliteTable(
  "works",
  {
    id: text("id").primaryKey(),
    type: text("type", { enum: WORK_TYPES }).notNull(),
    title: text("title").notNull(),
    titleEs: text("title_es"),
    titleEn: text("title_en"),
    originalTitle: text("original_title"),
    coverUrl: text("cover_url"),
    year: integer("year"),
    synopsis: text("synopsis"),
    synopsisEs: text("synopsis_es"),
    synopsisEn: text("synopsis_en"),
    externalSource: text("external_source", { enum: EXTERNAL_SOURCES }),
    externalId: text("external_id"),
    episodesTotal: integer("episodes_total"),
    chaptersTotal: integer("chapters_total"),
    pagesTotal: integer("pages_total"),
    /** Who created a manual work; `null` for imports and deleted users. */
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex("works_external_source_external_id_unique")
      .on(table.externalSource, table.externalId)
      .where(
        sql`${table.externalSource} is not null and ${table.externalId} is not null`,
      ),
    index("works_type_idx").on(table.type),
    index("works_created_by_idx").on(table.createdBy, table.createdAt),
    check("works_type_check", sql`${table.type} in ${sqlList(WORK_TYPES)}`),
    check(
      "works_external_source_check",
      sql`${table.externalSource} is null or ${table.externalSource} in ${sqlList(EXTERNAL_SOURCES)}`,
    ),
  ],
);

export const listEntries = sqliteTable(
  "list_entries",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workId: text("work_id")
      .notNull()
      .references(() => works.id, { onDelete: "cascade" }),
    status: text("status", { enum: LIST_STATUSES }).notNull(),
    score: integer("score"),
    progressValue: integer("progress_value").notNull().default(0),
    progressUnit: text("progress_unit", { enum: PROGRESS_UNITS }),
    notes: text("notes"),
    startedAt: integer("started_at", { mode: "timestamp" }),
    finishedAt: integer("finished_at", { mode: "timestamp" }),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    unique("list_entries_user_id_work_id_unique").on(
      table.userId,
      table.workId,
    ),
    index("list_entries_user_updated_idx").on(table.userId, table.updatedAt),
    index("list_entries_user_status_idx").on(table.userId, table.status),
    check(
      "list_entries_score_check",
      sql`${table.score} is null or ${table.score} between 1 and 10`,
    ),
    check("list_entries_progress_check", sql`${table.progressValue} >= 0`),
    check(
      "list_entries_status_check",
      sql`${table.status} in ${sqlList(LIST_STATUSES)}`,
    ),
    check(
      "list_entries_progress_unit_check",
      sql`${table.progressUnit} is null or ${table.progressUnit} in ${sqlList(PROGRESS_UNITS)}`,
    ),
  ],
);

export const searchCache = sqliteTable(
  "search_cache",
  {
    key: text("key").primaryKey(),
    payload: text("payload").notNull(),
    expiresAt: integer("expires_at").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("search_cache_expires_at_idx").on(table.expiresAt)],
);

/** Fixed rate-limit windows shared by every worker (SEC-A2). */
export const rateLimitWindows = sqliteTable(
  "rate_limit_windows",
  {
    key: text("key").primaryKey(),
    count: integer("count").notNull(),
    /** Epoch milliseconds. */
    resetAt: integer("reset_at").notNull(),
  },
  (table) => [index("rate_limit_windows_reset_at_idx").on(table.resetAt)],
);
