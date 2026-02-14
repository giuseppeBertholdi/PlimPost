const fs = require("fs");
const path = require("path");

const fontsPath = path.join(__dirname, "..", "fonts.txt");
const outPath = path.join(__dirname, "..", "lib", "fonts-data.generated.ts");

const raw = fs.readFileSync(fontsPath, "utf8");
const data = JSON.parse(raw);
const items = data.items || [];

function familyToParam(name) {
  return name.replace(/\s+/g, "+");
}

function buildGoogleFontParam(item) {
  const name = familyToParam(item.family);
  const variants = item.variants || [];
  const weights = new Set();
  for (const v of variants) {
    if (v === "regular" || v === "italic") weights.add(400);
    else if (/^\d+$/.test(v)) weights.add(parseInt(v, 10));
    else if (/^(\d+)italic$/.test(v)) weights.add(parseInt(RegExp.$1, 10));
  }
  const sorted = [...weights].filter(function(w) { return w >= 100 && w <= 900; }).sort(function(a, b) { return a - b; });
  if (sorted.length === 0) return name;
  if (sorted.length === 1 && sorted[0] === 400) return name;
  return name + ":wght@" + sorted.join(";");
}

function buildValue(item) {
  const fam = item.family;
  const cat = item.category || "sans-serif";
  return fam.indexOf(" ") >= 0 ? ("'" + fam + "', " + cat) : (fam + ", " + cat);
}

const withLatin = items.filter(function(item) { return (item.subsets || []).indexOf("latin") >= 0; });

const titleCategories = ["display", "handwriting"];
const textCategories = ["sans-serif", "serif"];

const titleOptions = [];
const textOptions = [];
const seenTitle = {};
const seenText = {};

for (let i = 0; i < withLatin.length; i++) {
  const item = withLatin[i];
  const name = item.family;
  const value = buildValue(item);
  const googleFont = buildGoogleFontParam(item);
  const entry = { name: name, value: value, googleFont: googleFont };
  const cat = (item.category || "").toLowerCase();

  if (titleCategories.indexOf(cat) >= 0 && !seenTitle[value]) {
    seenTitle[value] = true;
    titleOptions.push(entry);
  }
  if (textCategories.indexOf(cat) >= 0 && !seenText[value]) {
    seenText[value] = true;
    textOptions.push(entry);
  }
}

titleOptions.sort(function(a, b) { return a.name.localeCompare(b.name); });
textOptions.sort(function(a, b) { return a.name.localeCompare(b.name); });

function toTsArray(arr) {
  const lines = arr.map(function(o) {
    return "  { name: " + JSON.stringify(o.name) + ", value: " + JSON.stringify(o.value) + ", googleFont: " + JSON.stringify(o.googleFont) + " }";
  });
  return "[\n" + lines.join(",\n") + "\n]";
}

const header = "/** Gerado por scripts/generate-fonts-from-api.js */\n" +
  "export type FontOption = { name: string; value: string; googleFont: string; };\n\n";
const ts = header +
  "export const TITLE_FONT_OPTIONS: FontOption[] = " + toTsArray(titleOptions) + ";\n\n" +
  "export const TEXT_FONT_OPTIONS: FontOption[] = " + toTsArray(textOptions) + ";\n";

fs.writeFileSync(outPath, ts, "utf8");
console.log("Written", outPath, "Title:", titleOptions.length, "Text:", textOptions.length);
