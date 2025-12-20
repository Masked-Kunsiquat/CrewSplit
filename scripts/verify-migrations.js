#!/usr/bin/env node
/* eslint-env node */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");
const migrationsDir = path.join(repoRoot, "src", "db", "migrations");
const metaDir = path.join(migrationsDir, "meta");
const journalPath = path.join(metaDir, "_journal.json");
const drizzleBin = path.join(
  repoRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "drizzle-kit.cmd" : "drizzle-kit",
);
const schemaPath = path.join(repoRoot, "src", "db", "schema", "index.ts");

const listFiles = (dir, suffix) =>
  fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(suffix))
    .sort();

const diffFiles = (baseDir, compareDir, suffix) => {
  const base = new Set(listFiles(baseDir, suffix));
  return listFiles(compareDir, suffix).filter((file) => !base.has(file));
};

const fail = (message) => {
  throw new Error(message);
};

let tmpRoot = null;

try {
  if (!fs.existsSync(drizzleBin)) {
    fail(
      "drizzle-kit is not installed. Run npm ci before verifying migrations.",
    );
  }

  if (!fs.existsSync(journalPath)) {
    fail(
      "Missing migrations journal. Expected src/db/migrations/meta/_journal.json",
    );
  }

  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "crewsplit-migrations-"));
  const tmpMigrationsDir = path.join(tmpRoot, "migrations");
  const tmpMetaDir = path.join(tmpMigrationsDir, "meta");
  const tmpConfigPath = path.join(tmpRoot, "drizzle.config.cjs");

  fs.mkdirSync(tmpMetaDir, { recursive: true });
  fs.cpSync(migrationsDir, tmpMigrationsDir, { recursive: true });

  fs.writeFileSync(
    tmpConfigPath,
    [
      "module.exports = {",
      `  schema: ${JSON.stringify(schemaPath)},`,
      `  out: ${JSON.stringify(tmpMigrationsDir)},`,
      '  dialect: "sqlite",',
      '  driver: "expo",',
      "};",
      "",
    ].join("\n"),
  );

  execFileSync(
    drizzleBin,
    ["generate", "--config", tmpConfigPath],
    { stdio: "inherit" },
  );

  const originalJournal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
  const tempJournal = JSON.parse(
    fs.readFileSync(path.join(tmpMetaDir, "_journal.json"), "utf8"),
  );

  const newEntries = tempJournal.entries.slice(originalJournal.entries.length);
  const extraSql = diffFiles(migrationsDir, tmpMigrationsDir, ".sql");
  const extraSnapshots = diffFiles(metaDir, tmpMetaDir, "_snapshot.json");

  if (newEntries.length || extraSql.length || extraSnapshots.length) {
    const tags = newEntries.map((entry) => entry.tag).filter(Boolean);
    const details = [
      tags.length ? `New journal entries: ${tags.join(", ")}` : null,
      extraSql.length ? `New SQL files: ${extraSql.join(", ")}` : null,
      extraSnapshots.length
        ? `New snapshot files: ${extraSnapshots.join(", ")}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    fail(
      "Schema changes detected without committed migrations.\n" +
        "Run: npx drizzle-kit generate --config drizzle.config.ts\n" +
        (details ? `\n${details}` : ""),
    );
  }

  console.log("Migration verification passed: schema matches migrations.");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nMigration verification failed: ${message}`);
  process.exitCode = 1;
} finally {
  if (tmpRoot) {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}
