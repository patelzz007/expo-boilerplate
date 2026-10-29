// The design tokens' JavaScript values (the reference's packages/tokens) for code that needs a token in
// JavaScript — motion curves, the skeleton sweep, the brand mark, theme names. The colours, radii and type
// sizes live in src/styles/tokens.css (the generated mobile stylesheet). Vendored verbatim.

export { BRAND_MARK_FACETS, BRAND_MARK_VIEW_BOX, type BrandMarkFacet, type BrandMarkFacetName } from "./brand";
export { MOTION } from "./motion";
export { SKELETON_MOTION, type SkeletonSheen } from "./skeleton";
export type { ThemeName } from "./schema";
export { isDarkTheme } from "./theme-names";
