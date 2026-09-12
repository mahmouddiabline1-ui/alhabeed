import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateAssetManifest } from "../src/content/assetManifest.js";

const manifestPath = resolve(process.cwd(), "content/assets.manifest.json");
try {
  const raw = JSON.parse(readFileSync(manifestPath, "utf8"));
  const entries = validateAssetManifest(raw, true, process.cwd());
  console.log(`Validated ${entries.filter((entry) => entry.productionUse).length} production assets.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
