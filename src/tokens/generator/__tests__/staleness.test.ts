/// <reference types="node" />
// Runs on Node (the token generator and its checks), never in the app bundle.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { DARK_THEME, THEMES } from "../../semantic";
import { TOKEN_SOURCE } from "../../source";
import { paletteColor } from "../../value";
import { GENERATE_COMMAND } from "../common";
import { GENERATED_FILE_PATHS, generateTokenStylesheets } from "../generate";
import { findStaleStylesheets } from "../staleness";

/** Jest runs from the repository root (jest.config.js), where GENERATED_FILE_PATHS are rooted. */
const REPOSITORY_ROOT = process.cwd();

/** What the token source generates now, rendered once for the file (it draws the 1024 px launch icons). */
const GENERATED = generateTokenStylesheets(TOKEN_SOURCE);

function readCommitted(path: string): Uint8Array | undefined {
  const file = join(REPOSITORY_ROOT, path);
  return existsSync(file) ? readFileSync(file) : undefined;
}

describe("the committed generated files", () => {
  it(`matches what the token source generates now (if this fails, run \`${GENERATE_COMMAND}\` and commit the result)`, () => {
    expect(findStaleStylesheets(GENERATED, readCommitted)).toStrictEqual([]);
  });
});

describe("findStaleStylesheets", () => {
  it("reports nothing when every committed file matches", () => {
    expect(findStaleStylesheets(GENERATED, readCommitted)).toStrictEqual([]);
  });

  it("reports a hand edit of a generated file, naming the command to fix it", () => {
    const handEdited = (path: string): Uint8Array | undefined => {
      const committed = readCommitted(path);
      return path === GENERATED_FILE_PATHS["mobile.css"] && committed !== undefined
        ? new TextEncoder().encode(new TextDecoder().decode(committed).replace(/--card: [^;]+;/u, "--card: white;"))
        : committed;
    };

    // The edit must actually land, or this would pass for the wrong reason.
    expect(new TextDecoder().decode(handEdited(GENERATED_FILE_PATHS["mobile.css"]))).toContain("--card: white;");
    expect(findStaleStylesheets(GENERATED, handEdited)).toStrictEqual([
      `src/styles/tokens.css is out of date with src/tokens (or was edited by hand). Run \`${GENERATE_COMMAND}\` and commit the result.`,
    ]);
  });

  it("reports every output a token change affects until it is regenerated", () => {
    const changed = generateTokenStylesheets({
      ...TOKEN_SOURCE,
      themes: { ...THEMES, dark: { ...DARK_THEME, card: paletteColor("ink", "800") } },
    });

    expect(findStaleStylesheets(changed, readCommitted).map((problem) => problem.split(" ").at(0))).toStrictEqual([
      "src/styles/tokens.css",
    ]);
  });

  it("reports a committed file that is missing", () => {
    expect(findStaleStylesheets(GENERATED, () => undefined)).toHaveLength(GENERATED.length);
  });
});
