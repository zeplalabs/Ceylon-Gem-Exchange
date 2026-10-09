const { withAndroidManifest } = require('expo/config-plugins')

// Sets android:largeHeap="true" on the <application> tag. Without it the app
// runs under ART's default heap growth limit (192MB — the exact number in
// `target footprint 201326592` on every OutOfMemoryError this project has
// hit), which is tight for a Skia-shader-heavy, image-heavy RN app plus the
// dev client's own network-inspector overhead. A config plugin (not a direct
// AndroidManifest.xml edit) because `expo prebuild` regenerates that file
// from scratch and would silently drop a manual edit on the next run.
module.exports = function withAndroidLargeHeap(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application[0]
    application.$['android:largeHeap'] = 'true'
    return config
  })
}
