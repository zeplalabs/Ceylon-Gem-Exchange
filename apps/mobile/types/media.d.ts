// No image/video asset existed in this app before the gallery's demo clip
// (see gallery/[id].tsx) — Expo/RN's own type packages only declare
// *.css/*.sass/*.scss wildcard modules, nothing for binary media, so an
// `import` of a bundled asset file needs this ambient declaration or `tsc`
// can't resolve it. The default export matches what Metro's asset plugin
// actually returns for a `require()`/`import` of a local file (a numeric
// asset id), which is also one of `expo-video`'s own `VideoSource` union
// members — no cast needed at the call site.
declare module '*.mp4' {
  const assetId: number
  export default assetId
}

// Same reasoning as `*.mp4` above — a numeric Metro asset id, which is
// also what `expo-image`'s `source` prop accepts directly (no `{ uri }`
// wrapping needed) and what `expo-asset`'s `Asset.fromModule()` accepts
// for resolving a real file URI (used for the certificate PDFs, since
// `react-native-webview` needs an actual URI, not an asset id).
declare module '*.jpg' {
  const assetId: number
  export default assetId
}
declare module '*.jpeg' {
  const assetId: number
  export default assetId
}
declare module '*.png' {
  const assetId: number
  export default assetId
}
declare module '*.webp' {
  const assetId: number
  export default assetId
}
declare module '*.pdf' {
  const assetId: number
  export default assetId
}
