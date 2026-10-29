/// <reference types="node" />
// Runs on Node (the token generator and its checks), never in the app bundle.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { GeneratedFileNameSchema } from "../../schema";
import { GENERATED_FILE_PATHS } from "../generate";

/** Comments removed the way a CSS parser does: each `/*` ends at the FIRST `*\/`, wherever it sits. */
function withoutComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//gu, "");
}

/** A custom-property declaration (`--name: value;`) on one line. */
const DECLARATION = /^\s*--[\w-]+\s*:\s*[^;{}]+;\s*$/u;

/** A rule's selector line (`:root {`, `.dark {`, `@theme inline {`, `@variant dark {`) or its closing brace. */
const BLOCK_EDGE = /^\s*(?:[^{};]+\{|\})\s*$/u;

/** A top-level custom variant (`@custom-variant nord (&:where(.nord, .nord *));`), the one block-less statement the generator writes. */
const CUSTOM_VARIANT = /^@custom-variant [a-z][\w-]* \([^;{}]+\);$/u;

/** The generated stylesheets (Jest runs from the repository root, where GENERATED_FILE_PATHS are rooted). */
const STYLESHEETS = GeneratedFileNameSchema.options.filter((fileName) => fileName.endsWith(".css"));

function readStylesheet(fileName: (typeof STYLESHEETS)[number]): string {
  return readFileSync(join(process.cwd(), GENERATED_FILE_PATHS[fileName]), "utf8");
}

describe.each(STYLESHEETS)("generated %s syntax", (fileName) => {
  it("leaves only selectors, braces, token declarations and custom variants once comments are stripped — a stray `*/` inside the header comment would leak text into a rule and break every app's build", () => {
    const css = readStylesheet(fileName);
    const strayLines = withoutComments(css)
      .split("\n")
      .filter(
        (line) => line.trim() !== "" && !DECLARATION.test(line) && !BLOCK_EDGE.test(line) && !CUSTOM_VARIANT.test(line)
      );

    expect(strayLines).toStrictEqual([]);
  });

  it("balances its braces", () => {
    const css = withoutComments(readStylesheet(fileName));

    expect(css.split("{").length).toBe(css.split("}").length);
  });
});
