import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

export type AssetLicense = "owned" | "cc0" | "cc-by" | "licensed" | "unverified";
export interface AssetManifestEntry { id:string; path:string; creatorOrMethod:string; sourceOrPrompt:string; license:AssetLicense; createdAt:string; sha256:string; productionUse:boolean; }

const digestPattern = /^[a-f0-9]{64}$/;
const datePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
function filePath(entry: AssetManifestEntry, baseDir = process.cwd()) { return isAbsolute(entry.path) ? entry.path : resolve(baseDir, entry.path); }
function digest(path: string) { return createHash("sha256").update(readFileSync(path)).digest("hex"); }

export function validateAssetManifest(raw: unknown, production = false, baseDir = process.cwd()): AssetManifestEntry[] {
  if (!Array.isArray(raw)) throw new Error("Asset manifest must be an array");
  const entries = raw as AssetManifestEntry[];
  const ids = new Set<string>(), paths = new Set<string>();
  entries.forEach((entry, index) => {
    const label = `Asset manifest entry ${index}`;
    if (!entry || typeof entry !== "object") throw new Error(`${label} must be an object`);
    if (!entry.id || ids.has(entry.id)) throw new Error(`${label} has a missing or duplicate id`); ids.add(entry.id);
    if (!entry.path || paths.has(entry.path)) throw new Error(`${label} has a missing or duplicate path`); paths.add(entry.path);
    if (!entry.creatorOrMethod?.trim() || !entry.sourceOrPrompt?.trim()) throw new Error(`${label} is missing creator/source metadata`);
    if (!datePattern.test(entry.createdAt) || Number.isNaN(Date.parse(entry.createdAt))) throw new Error(`${label} has an invalid ISO creation date`);
    if (!digestPattern.test(entry.sha256)) throw new Error(`${label} has an invalid SHA-256 digest`);
    if (!["owned", "cc0", "cc-by", "licensed", "unverified"].includes(entry.license)) throw new Error(`${label} has an invalid license`);
    if (entry.license === "cc-by" && !entry.creatorOrMethod.toLowerCase().includes("attribution")) throw new Error(`${label} requires attribution metadata`);
    if (["cc-by", "licensed"].includes(entry.license) && !/^https:\/\//i.test(entry.sourceOrPrompt)) throw new Error(`${label} requires an HTTPS source for third-party licenses`);
    if (production && entry.productionUse && entry.license === "unverified") throw new Error(`${label} cannot use an unverified license in production`);
    if (production && entry.productionUse) {
      const path = filePath(entry, baseDir);
      if (!existsSync(path)) throw new Error(`${label} file does not exist: ${entry.path}`);
      if (digest(path) !== entry.sha256) throw new Error(`${label} digest mismatch: ${entry.path}`);
    }
  });
  return entries;
}
