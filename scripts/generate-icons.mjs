import sharp from "sharp";
import { readFileSync } from "fs";
import { mkdirSync } from "fs";

mkdirSync("public/icons", { recursive: true });

const svg = readFileSync("public/icon.svg");

await sharp(svg).resize(192, 192).png().toFile("public/icons/icon-192x192.png");
console.log("✓ icon-192x192.png");

await sharp(svg).resize(512, 512).png().toFile("public/icons/icon-512x512.png");
console.log("✓ icon-512x512.png");

await sharp(svg).resize(180, 180).png().toFile("public/icons/apple-touch-icon.png");
console.log("✓ apple-touch-icon.png");
