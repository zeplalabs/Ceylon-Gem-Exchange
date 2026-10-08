import type { VideoSource } from 'expo-video'
import demoVideoAsset from '../assets/videos/gallery-demo.mp4'
import type { ListingDetail } from './listings'

export interface Shot {
  title: string
  /** The seller's own caption for this photo — optional because they may
   * not have written one; a caption UI is hidden entirely for a shot with
   * no caption rather than showing a title with nothing under it. */
  caption?: string
  kind: 'photo' | 'video'
  /** Bundled demo clip for `kind: 'video'` shots — a real asset shipped in
   * the app (`assets/videos/`), not a placeholder, standing in for an
   * actual seller-uploaded clip until the upload pipeline exists. Omitted
   * for photo shots. */
  video?: VideoSource
}

// Static import so Metro resolves and bundles the file at build time — the
// same mechanism `expo-image`/RN's own `Image` use for local assets. Typed
// via the ambient `*.mp4` module declaration in `types/media.d.ts` (no
// asset of any kind existed in this app before this file — see that
// declaration's own comment for why it's needed).
const DEMO_VIDEO: VideoSource = demoVideoAsset

// Ported verbatim from "Ceylon Gem Exchange Gallery Viewer.dc.html"'s own
// `media` array — a generic photography checklist (face-up shot, rotation
// clip, pavilion view, loupe macro, scale reference) that reads naturally
// for any gem listing rather than being authored per-listing. Shared by
// both the Listing Detail hero gallery and the Gallery Viewer screen so
// the two stay in lockstep on which shot is the video and at which index.
export const SHOTS: Shot[] = [
  {
    title: 'Face-up, daylight',
    caption: 'Royal blue saturation under D65 lighting.',
    kind: 'photo',
  },
  {
    title: 'Rotation clip',
    caption: '360° turn showing lustre and extinction.',
    kind: 'video',
    video: DEMO_VIDEO,
  },
  { title: 'Pavilion view', kind: 'photo' },
  { title: '10× loupe', caption: 'Inclusion map — eye-clean, minor silk.', kind: 'photo' },
  { title: 'On hand', caption: 'Scale reference on a size 7 finger.', kind: 'photo' },
]

// Reused by taking the first `photoCount` entries, so lot '1' (photoCount
// 4, the one real mockup-sourced listing) gets the mockup's own first four
// exactly. "Pavilion view" is left without a caption (the mockup gave it
// one, same as every other shot) specifically to exercise the
// hidden-when-no-caption case with real demo data instead of only in
// theory.
export function getListingMedia(listing: ListingDetail): Shot[] {
  return SHOTS.slice(0, listing.photoCount)
}
