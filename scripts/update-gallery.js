const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const IMAGES_DIR = path.join(ROOT, "images");
const INDEX_PATH = path.join(ROOT, "index.html");
const START = "<!-- GALLERY:START -->";
const END = "<!-- GALLERY:END -->";
const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function titleCase(value) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function captionFromFilename(filename) {
  const name = filename.replace(/\.[^.]+$/, "");
  return titleCase(name.replace(/[_-]+/g, " "));
}

function altFromCaption(caption) {
  return `${caption}.`;
}

function buildFigure(filename) {
  const caption = captionFromFilename(filename);
  const alt = altFromCaption(caption);
  return [
    "        <figure class=\"gallery-tile\">",
    `          <img src="images/${filename}" alt="${alt}" />`,
    `          <figcaption>${caption}</figcaption>`,
    "        </figure>"
  ].join("\n");
}

function run() {
  if (!fs.existsSync(IMAGES_DIR)) {
    throw new Error("Images folder not found.");
  }

  const files = fs
    .readdirSync(IMAGES_DIR)
    .filter((file) => IMAGE_EXTS.has(path.extname(file).toLowerCase()))
    .map((file) => {
      const fullPath = path.join(IMAGES_DIR, file);
      const stat = fs.statSync(fullPath);
      return { file, mtime: stat.mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime)
    .map((entry) => entry.file);

  const html = fs.readFileSync(INDEX_PATH, "utf-8");
  const startIndex = html.indexOf(START);
  const endIndex = html.indexOf(END);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    throw new Error("Gallery markers not found in index.html.");
  }

  const before = html.slice(0, startIndex + START.length);
  const after = html.slice(endIndex);
  const figures = files.map(buildFigure).join("\n");
  const updated = `${before}\n${figures}\n        ${after}`;

  fs.writeFileSync(INDEX_PATH, updated, "utf-8");
}

run();
