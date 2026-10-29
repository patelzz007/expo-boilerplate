// ============================================
// generator/staleness.ts — are the committed files what the source generates?
// ============================================
// Generated files are committed (the app imports the stylesheet without a build step), so a
// token edit without a regenerate — or a hand edit of the output — must fail
// `pnpm run test`, and therefore CI.

import { GENERATE_COMMAND } from "./common";
import { GENERATED_FILE_PATHS, type GeneratedStylesheet } from "./generate";

const TEXT_ENCODER = new TextEncoder();

function bytesOf(contents: string | Uint8Array): Uint8Array {
  return contents instanceof Uint8Array ? contents : TEXT_ENCODER.encode(contents);
}

function haveSameBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((byte: number, index: number): boolean => byte === right[index]);
}

/**
 * One line per committed file that is missing or differs from what the source
 * generates now; empty when everything is current. `readCommitted` receives the
 * file's repository path and returns its committed bytes, or `undefined` when it does not exist.
 */
export function findStaleStylesheets(
  expected: readonly GeneratedStylesheet[],
  readCommitted: (path: string) => Uint8Array | undefined
): readonly string[] {
  return expected.flatMap(({ fileName, contents }): readonly string[] => {
    const path = GENERATED_FILE_PATHS[fileName];
    const committed = readCommitted(path);
    if (committed === undefined) {
      return [`${path} is missing. Run \`${GENERATE_COMMAND}\` and commit the result.`];
    }
    if (!haveSameBytes(committed, bytesOf(contents))) {
      return [
        `${path} is out of date with src/tokens (or was edited by hand). Run \`${GENERATE_COMMAND}\` and commit the result.`,
      ];
    }
    return [];
  });
}
