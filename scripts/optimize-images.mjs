// Optimize product photos for the web.
//
// Reads every JPG under public/images/products/, generates two WebP variants
// per source image:
//   - <name>.webp       — full-quality display (max 1200px wide, q=80)
//   - <name>-sm.webp    — small thumbnail for grid / mosaic (max 600px, q=78)
//   - <name>.jpg        — same dimensions as the full WebP, as a fallback
//
// Run with:  node scripts/optimize-images.mjs
//
// Sharp is a devDependency; this script never runs in production.

import { readdir, mkdir, stat } from 'node:fs/promises';
import { join, parse } from 'node:path';
import sharp from 'sharp';

const SRC_DIR = 'public/images/products';

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile() && /\.(jpe?g|png)$/i.test(entry.name)) {
      yield full;
    }
  }
}

async function processOne(srcPath) {
  const { dir, name } = parse(srcPath);
  const fullWebp = join(dir, `${name}.webp`);
  const smWebp = join(dir, `${name}-sm.webp`);
  const jpgOut = join(dir, `${name}.jpg`);

  const original = await stat(srcPath);

  // Full-size WebP (max 1200px wide, q=80) — used by the editorial hero,
  // wide banner, mosaic tall tiles, and product detail.
  await sharp(srcPath)
    .rotate()
    .resize({ width: 1200, height: 1500, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80, effort: 6 })
    .toFile(fullWebp + '.tmp');

  // Small WebP (max 600px wide, q=78) — used by ProductCard grid and mosaic
  // smaller tiles, where a 1200px image is wasteful.
  await sharp(srcPath)
    .rotate()
    .resize({ width: 600, height: 750, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 78, effort: 6 })
    .toFile(smWebp + '.tmp');

  // Re-encode the JPEG fallback at sane dimensions and quality. Browsers
  // older than ~2020 may need this. Includes mozjpeg-style optimization.
  await sharp(srcPath)
    .rotate()
    .resize({ width: 1200, height: 1500, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82, progressive: true, mozjpeg: true })
    .toFile(jpgOut + '.tmp');

  // Move tmp files into place atomically.
  const { rename } = await import('node:fs/promises');
  await rename(fullWebp + '.tmp', fullWebp);
  await rename(smWebp + '.tmp', smWebp);
  await rename(jpgOut + '.tmp', jpgOut);

  const [fullStat, smStat, jpgStat] = await Promise.all([
    stat(fullWebp),
    stat(smWebp),
    stat(jpgOut),
  ]);

  return {
    name: parse(srcPath).base,
    originalKB: Math.round(original.size / 1024),
    fullWebpKB: Math.round(fullStat.size / 1024),
    smWebpKB: Math.round(smStat.size / 1024),
    jpgKB: Math.round(jpgStat.size / 1024),
  };
}

async function main() {
  await mkdir(SRC_DIR, { recursive: true });

  const sources = [];
  for await (const file of walk(SRC_DIR)) sources.push(file);

  if (sources.length === 0) {
    console.log('No source images found under', SRC_DIR);
    return;
  }

  console.log(`Optimizing ${sources.length} images…\n`);
  const rows = [];
  for (const src of sources) {
    try {
      const row = await processOne(src);
      rows.push(row);
      console.log(
        ` ${row.name}: ${row.originalKB} KB → ${row.jpgKB} KB jpg, ${row.fullWebpKB} KB webp, ${row.smWebpKB} KB webp-sm`,
      );
    } catch (err) {
      console.error(`  failed: ${src}`, err.message);
    }
  }

  const totalOriginal = rows.reduce((s, r) => s + r.originalKB, 0);
  const totalWebp = rows.reduce((s, r) => s + r.fullWebpKB + r.smWebpKB, 0);
  const totalJpg = rows.reduce((s, r) => s + r.jpgKB, 0);

  console.log('\nDone.');
  console.log(` Original total: ${(totalOriginal / 1024).toFixed(2)} MB`);
  console.log(` Full WebP total: ${(rows.reduce((s, r) => s + r.fullWebpKB, 0) / 1024).toFixed(2)} MB`);
  console.log(` Small WebP total: ${(rows.reduce((s, r) => s + r.smWebpKB, 0) / 1024).toFixed(2)} MB`);
  console.log(` JPG fallback total: ${(totalJpg / 1024).toFixed(2)} MB`);
  console.log(` Combined output: ${((totalWebp + totalJpg) / 1024).toFixed(2)} MB`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
