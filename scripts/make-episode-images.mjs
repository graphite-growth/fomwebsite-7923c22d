#!/usr/bin/env node
/**
 * Generate the three episode images from a single source photo.
 *
 *   npm run make:images <slug> <path-to-photo>
 *   e.g.  npm run make:images scott-holden ~/Downloads/scott.jpg
 *
 * Produces (optimized JPGs, ~150–250 KB each):
 *   public/images/assets/guest-<slug>.jpg        1200×1500  portrait card
 *   public/images/assets/guest-<slug>-cover.jpg  1600×900   detail-page cover
 *   public/images/og-<slug>.jpg                  1200×630   social share
 *                                                 (photo + white FOM logo, top-right)
 *
 * The OG logo lockup lives at public/images/assets/fom-og-logo.svg.
 * After running, register the slug in src/lib/episodeImages.ts and run
 * `npm run check:seo` (see ADDING_EPISODES.md).
 */
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const [slug, srcArg] = process.argv.slice(2);
if (!slug || !srcArg) {
  console.error("Usage: npm run make:images <slug> <path-to-photo>");
  process.exit(1);
}
const src = path.resolve(srcArg.replace(/^~/, process.env.HOME ?? "~"));
if (!existsSync(src)) {
  console.error(`Source photo not found: ${src}`);
  process.exit(1);
}

const assets = path.join(root, "public/images/assets");
const images = path.join(root, "public/images");
const logoSvg = path.join(assets, "fom-og-logo.svg");

const QUALITY = 80;

// OG logo placement (relative to the 1200×630 canvas)
const OG_W = 1200;
const OG_H = 630;
const LOGO_W = 188;
const LOGO_MARGIN_TOP = 58;
const LOGO_MARGIN_RIGHT = 68;

async function run() {
  // 1) Portrait card — 1200×1500
  await sharp(src)
    .resize(1200, 1500, { fit: "cover", position: "centre" })
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toFile(path.join(assets, `guest-${slug}.jpg`));

  // 2) Cover — 1600×900
  await sharp(src)
    .resize(1600, 900, { fit: "cover", position: "centre" })
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toFile(path.join(assets, `guest-${slug}-cover.jpg`));

  // 3) OG — 1200×630 photo + white FOM logo composited top-right
  const logo = await sharp(logoSvg, { density: 400 })
    .resize({ width: LOGO_W })
    .png()
    .toBuffer();

  await sharp(src)
    .resize(OG_W, OG_H, { fit: "cover", position: "centre" })
    .composite([
      {
        input: logo,
        top: LOGO_MARGIN_TOP,
        left: OG_W - LOGO_W - LOGO_MARGIN_RIGHT,
      },
    ])
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toFile(path.join(images, `og-${slug}.jpg`));

  console.log(`✓ Generated images for "${slug}":`);
  console.log(`  public/images/assets/guest-${slug}.jpg        (1200×1500 card)`);
  console.log(`  public/images/assets/guest-${slug}-cover.jpg  (1600×900 cover)`);
  console.log(`  public/images/og-${slug}.jpg                  (1200×630 OG + logo)`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
