// The mockups' CTA/checkbox/role gradients use `linear-gradient(140deg,...)`.
// RN's LinearGradient takes start/end points, not a CSS angle — this is the
// standard deg->point conversion (line through the center at that angle,
// clamped to the unit box) evaluated once for the one angle this app's
// components currently need.
export const GRADIENT_140 = { start: { x: 0.179, y: 0.117 }, end: { x: 0.821, y: 0.883 } }
