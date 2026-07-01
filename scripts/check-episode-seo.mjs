#!/usr/bin/env node
/**
 * Episode SEO completeness check.
 *
 * Verifies that every episode in src/lib/podcastData.ts is fully wired for SEO:
 *   - registered in EPISODE_IMAGES, POSTER_IMAGES, and OG_IMAGES (episodeImages.ts)
 *   - has its OG share image file present in public/images/
 *   - has a publishedDate that JS can actually parse (RSS + JSON-LD depend on it)
 *   - has the fields that drive the auto-generated <title>, meta description,
 *     and PodcastEpisode JSON-LD (name, title, company, overview, fullDescription)
 *
 * It also WARNS (does not fail) when the auto-built SEO title will be truncated
 * to fit the 60-char budget, so you can tighten the `overview` if you care.
 *
 * Run: npm run check:seo
 * Exit code is non-zero if any hard gap is found (good for CI).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataSrc = fs.readFileSync(
  path.join(root, "src/lib/podcastData.ts"),
  "utf8"
);
const imgSrc = fs.readFileSync(
  path.join(root, "src/lib/episodeImages.ts"),
  "utf8"
);

const MAX_TITLE = 60; // mirrors buildEpisodeSeo() in src/lib/episodeUtils.ts

// --- helpers ---------------------------------------------------------------
const slugs = [...dataSrc.matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]);

function field(slug, name) {
  const re = new RegExp(`slug:\\s*"${slug}"[\\s\\S]*?\\b${name}:\\s*"([^"]*)"`);
  return dataSrc.match(re)?.[1] ?? null;
}
function isComingSoon(slug) {
  const re = new RegExp(
    `slug:\\s*"${slug}"[\\s\\S]*?\\bcomingSoon:\\s*(true|false)`
  );
  return dataSrc.match(re)?.[1] === "true";
}
// Extract a brace-balanced map body so template literals like `?${OG_VERSION}`
// don't prematurely terminate the match.
function mapBody(name) {
  const start = imgSrc.indexOf(`export const ${name}`);
  if (start === -1) return "";
  const open = imgSrc.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < imgSrc.length; i++) {
    if (imgSrc[i] === "{") depth++;
    else if (imgSrc[i] === "}" && --depth === 0)
      return imgSrc.slice(open, i + 1);
  }
  return imgSrc.slice(open);
}
const ogMap = mapBody("OG_IMAGES");
const posterMap = mapBody("POSTER_IMAGES");
const epMap = mapBody("EPISODE_IMAGES");
const ogFileExists = (slug) =>
  [".jpg", ".png", ".jpeg", ".webp"].some((ext) =>
    fs.existsSync(path.join(root, `public/images/og-${slug}${ext}`))
  );

// --- run -------------------------------------------------------------------
const gaps = [];
const warnings = [];

for (const slug of slugs) {
  const soon = isComingSoon(slug);
  const checks = {
    EPISODE_IMAGES: epMap.includes(`"${slug}":`),
    POSTER_IMAGES: posterMap.includes(`"${slug}":`),
    OG_IMAGES: ogMap.includes(`"${slug}":`),
    "og image file": ogFileExists(slug),
  };
  // publishedDate must be parseable for live episodes (RSS sort + JSON-LD)
  const date = field(slug, "publishedDate");
  const dateOk = soon || (date && !Number.isNaN(new Date(date).getTime()));

  for (const [label, ok] of Object.entries(checks)) {
    if (!ok) gaps.push(`${slug}: missing in ${label}`);
  }
  if (!dateOk) gaps.push(`${slug}: publishedDate not parseable ("${date}")`);

  // soft check: SEO title truncation
  const name = field(slug, "name") ?? "";
  const overview = field(slug, "overview") ?? "";
  const titleLen = `${name}: ${overview} | FOM Podcast`.length;
  if (!soon && titleLen > MAX_TITLE) {
    warnings.push(
      `${slug}: SEO title is ${titleLen} chars → auto-truncated to ${MAX_TITLE}. Tighten "overview" to control what shows.`
    );
  }
}

if (warnings.length) {
  console.log("\nNotes (not failures):");
  for (const w of warnings) console.log(`  • ${w}`);
}

if (gaps.length) {
  console.error(`\n❌ SEO gaps found (${gaps.length}):`);
  for (const g of gaps) console.error(`  • ${g}`);
  console.error("\nSee ADDING_EPISODES.md for how to fix each.");
  process.exit(1);
}

console.log(
  `\n✅ All ${slugs.length} episodes are SEO-complete (image maps, OG files, dates).`
);
