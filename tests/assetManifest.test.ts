import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { validateAssetManifest } from "../src/content/assetManifest.js";

test("asset manifest validates the production manifest and real file digests", () => {
    const raw = JSON.parse(readFileSync("content/assets.manifest.json", "utf8"));
    assert.equal(validateAssetManifest(raw, true).length, 3);
  });

test("asset manifest rejects production assets with unverified licenses", () => {
    const entry = { id: "x", path: "missing.svg", creatorOrMethod: "made here", sourceOrPrompt: "original", license: "unverified", createdAt: "2026-09-13T00:00:00.000Z", sha256: "a".repeat(64), productionUse: true };
    assert.throws(() => validateAssetManifest([entry], true), /unverified/i);
  });
