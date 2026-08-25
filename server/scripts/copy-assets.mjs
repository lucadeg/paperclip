import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, "..");

const assetsToCopy = [
  { src: "src/onboarding-assets", dest: "dist/onboarding-assets" },
  { src: "src/built-ins", dest: "dist/built-ins" },
];

for (const { src, dest } of assetsToCopy) {
  const srcPath = path.join(serverRoot, src);
  const destPath = path.join(serverRoot, dest);

  if (fs.existsSync(srcPath)) {
    fs.mkdirSync(destPath, { recursive: true });
    fs.cpSync(srcPath, destPath, { recursive: true });
    console.log(`[copy-assets] Copied ${src} -> ${dest}`);
  }
}
