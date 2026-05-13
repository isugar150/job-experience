import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const ROOT = process.cwd();
const JOBS_DIR = path.join(ROOT, "public", "jobs");
const JOBS_JSON = path.join(ROOT, "src", "data", "jobs.json");
const SOURCE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

const DEFAULT_SIZE = 640;
const DEFAULT_QUALITY = 82;

function readOptions(argv) {
  const opts = {
    size: DEFAULT_SIZE,
    quality: DEFAULT_QUALITY,
    keepOriginal: false,
    dryRun: false,
  };

  for (const arg of argv) {
    if (arg === "--keep-original") {
      opts.keepOriginal = true;
    } else if (arg === "--dry-run") {
      opts.dryRun = true;
    } else if (arg.startsWith("--size=")) {
      opts.size = Number(arg.slice("--size=".length));
    } else if (arg.startsWith("--quality=")) {
      opts.quality = Number(arg.slice("--quality=".length));
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!Number.isInteger(opts.size) || opts.size < 128 || opts.size > 2048) {
    throw new Error("--size must be an integer between 128 and 2048.");
  }
  if (!Number.isInteger(opts.quality) || opts.quality < 1 || opts.quality > 100) {
    throw new Error("--quality must be an integer between 1 and 100.");
  }

  return opts;
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getSourceFiles() {
  const entries = await fs.readdir(JOBS_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => SOURCE_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .map((name) => path.join(JOBS_DIR, name))
    .sort((a, b) => {
      const aNum = Number(path.basename(a, path.extname(a)));
      const bNum = Number(path.basename(b, path.extname(b)));
      if (Number.isFinite(aNum) && Number.isFinite(bNum)) return aNum - bNum;
      return a.localeCompare(b);
    });
}

async function optimizeImage(sourcePath, opts) {
  const ext = path.extname(sourcePath).toLowerCase();
  const outputPath = path.join(
    path.dirname(sourcePath),
    `${path.basename(sourcePath, ext)}.webp`
  );
  const tmpPath = `${outputPath}.tmp`;
  const before = (await fs.stat(sourcePath)).size;

  if (opts.dryRun) {
    return { sourcePath, outputPath, before, after: 0, deleted: false, skipped: false };
  }

  const { data, info } = await sharp(sourcePath)
    .rotate()
    .resize({
      width: opts.size,
      height: opts.size,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({
      quality: opts.quality,
      effort: 6,
    })
    .toBuffer({ resolveWithObject: true });

  if (info.format !== "webp" || !info.width || !info.height) {
    throw new Error(`Failed to create a valid WebP: ${outputPath}`);
  }

  await fs.writeFile(tmpPath, data);
  await fs.rename(tmpPath, outputPath);
  const after = (await fs.stat(outputPath)).size;
  const samePath = path.resolve(sourcePath).toLowerCase() === path.resolve(outputPath).toLowerCase();
  let deleted = false;

  if (!samePath && !opts.keepOriginal) {
    await fs.rm(sourcePath);
    deleted = true;
  }

  return { sourcePath, outputPath, before, after, deleted, skipped: false };
}

async function updateJobsJson(opts) {
  const raw = await fs.readFile(JOBS_JSON, "utf8");
  const data = JSON.parse(raw);
  let changed = 0;

  for (const job of data.jobs ?? []) {
    if (typeof job.image !== "string") continue;
    const current = job.image;
    const ext = path.extname(current).toLowerCase();
    if (!SOURCE_EXTENSIONS.has(ext) || ext === ".webp") continue;

    const imageName = path.basename(current, ext);
    const webpPath = path.join(JOBS_DIR, `${imageName}.webp`);
    if (await pathExists(webpPath)) {
      job.image = `/jobs/${imageName}.webp`;
      changed += 1;
    }
  }

  if (changed > 0 && !opts.dryRun) {
    await fs.writeFile(JOBS_JSON, `${JSON.stringify(data, null, 2)}\n`);
  }

  return changed;
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

async function main() {
  const opts = readOptions(process.argv.slice(2));
  const files = await getSourceFiles();
  let beforeTotal = 0;
  let afterTotal = 0;
  let converted = 0;
  let deleted = 0;

  for (const file of files) {
    const result = await optimizeImage(file, opts);
    beforeTotal += result.before;
    afterTotal += result.after;
    converted += 1;
    if (result.deleted) deleted += 1;
    const relSource = path.relative(ROOT, result.sourcePath);
    const relOutput = path.relative(ROOT, result.outputPath);
    const afterText = opts.dryRun ? "dry-run" : formatBytes(result.after);
    console.log(`${relSource} -> ${relOutput} (${formatBytes(result.before)} -> ${afterText})`);
  }

  const jsonChanged = await updateJobsJson(opts);
  const saved = beforeTotal - afterTotal;

  console.log("");
  console.log(`Optimized images: ${converted}`);
  console.log(`Deleted source files: ${opts.dryRun ? 0 : deleted}`);
  console.log(`jobs.json image paths updated: ${opts.dryRun ? `${jsonChanged} pending` : jsonChanged}`);
  if (!opts.dryRun) {
    console.log(`Total size: ${formatBytes(beforeTotal)} -> ${formatBytes(afterTotal)} (${formatBytes(saved)} saved)`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
