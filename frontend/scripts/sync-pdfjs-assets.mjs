import { cp, mkdir, readFile } from "node:fs/promises";

// Serve the installed PDF.js decoder/font data from the same origin, including in standalone builds.
const source = new URL("../node_modules/pdfjs-dist/", import.meta.url);
const { version } = JSON.parse(await readFile(new URL("package.json", source), "utf8"));
const destination = new URL(`../public/pdfjs/${version}/`, import.meta.url);
await mkdir(destination, { recursive: true });
await Promise.all(["wasm", "cmaps", "standard_fonts", "iccs", "LICENSE"].map(name =>
  cp(new URL(name, source), new URL(name, destination), { recursive: true }),
));
