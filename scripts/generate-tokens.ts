// ============================================
// scripts/generate-tokens.ts — `pnpm run tokens:generate`
// ============================================
// Writes every generated file (generator/generate.ts → GENERATED_FILE_PATHS): the stylesheet global.css
// imports (src/styles/tokens.css) and the launch assets app.json points at (assets/). The output is
// deterministic, so running it twice changes nothing; commit what it writes. Exits non-zero (the generator
// throws) on any invalid token.

/// <reference types="node" />
// Runs on Node (the token generator and its checks), never in the app bundle.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { GENERATED_FILE_PATHS, generateTokenStylesheets } from "../src/tokens/generator/generate";
import { TOKEN_SOURCE } from "../src/tokens/source";

const REPOSITORY_ROOT = new URL("../", import.meta.url);

function main(): void {
  for (const { fileName, contents } of generateTokenStylesheets(TOKEN_SOURCE)) {
    const target = fileURLToPath(new URL(GENERATED_FILE_PATHS[fileName], REPOSITORY_ROOT));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, contents);
    process.stdout.write(`wrote ${target}\n`);
  }
}

main();
