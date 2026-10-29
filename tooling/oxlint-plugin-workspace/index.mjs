// The repository's own lint rules (rules/13-ci-cd-and-quality-gates.md, "The lint configuration").
import {
  accessibleElements,
  noColorLiterals,
  noFontWeightUtilities,
  noInlineStyles,
  noRawText,
} from "./react-native.mjs";
import { restrictedSyntax } from "./restricted-syntax.mjs";

export default {
  meta: { name: "workspace" },
  rules: {
    "restricted-syntax": restrictedSyntax,
    "no-raw-text": noRawText,
    "accessible-elements": accessibleElements,
    "no-inline-styles": noInlineStyles,
    "no-color-literals": noColorLiterals,
    "no-font-weight-utilities": noFontWeightUtilities,
  },
};
