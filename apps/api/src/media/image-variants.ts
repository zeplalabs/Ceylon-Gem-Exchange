import sharp from 'sharp'

// Long-edge targets for the three listing-photo contexts this app actually
// renders at: a list/grid card thumbnail, a wider card/preview, and the
// full listing-detail/gallery view. `withoutEnlargement` means a photo
// smaller than a given target (rare, since uploadPhoto.ts already caps
// originals at 1600px but doesn't upscale small ones) is left at its own
// size rather than stretched up.
export const VARIANT_SIZES = [
  { name: 'thumb', width: 320 },
  { name: 'card', width: 640 },
  { name: 'detail', width: 1600 },
] as const

// webp/avif only, per E1.2's own checklist line — no jpeg fallback variant,
// since every target platform this app ships to (iOS 14+/Android 12+ via
// expo-image, evergreen browsers for the later web app) already decodes
// both natively.
export const VARIANT_FORMATS = ['webp', 'avif'] as const

export type VariantSizeName = (typeof VARIANT_SIZES)[number]['name']
export type VariantFormatName = (typeof VARIANT_FORMATS)[number]

export interface GeneratedVariant {
  size: VariantSizeName
  format: VariantFormatName
  buffer: Buffer
  contentType: string
}

// sharp strips all metadata (EXIF, ICC profile, XMP — GPS tags included)
// from its output by default unless `.withMetadata()` is explicitly
// called, which it never is below — so this one fact satisfies E1.2's
// "EXIF GPS stripped" on its own, with no separate stripping step needed.
// The one thing EXIF also carries that genuinely matters for correctness
// is orientation (a phone photo taken sideways/upside-down is tagged, not
// physically rotated) — `.rotate()` with no arguments bakes that rotation
// into the actual pixels *before* the metadata carrying it is dropped, so
// stripping EXIF here doesn't also silently stand portrait photos on
// their side.
export async function generateImageVariants(original: Buffer): Promise<GeneratedVariant[]> {
  const jobs = VARIANT_SIZES.flatMap((size) =>
    VARIANT_FORMATS.map(async (format) => {
      const buffer = await sharp(original)
        .rotate()
        .resize({ width: size.width, withoutEnlargement: true })
        .toFormat(format, format === 'webp' ? { quality: 80 } : { quality: 55 })
        .toBuffer()
      return { size: size.name, format, buffer, contentType: `image/${format}` }
    }),
  )
  return Promise.all(jobs)
}

export function variantObjectKey(
  listingId: string,
  photoId: string,
  size: VariantSizeName,
  format: VariantFormatName,
) {
  return `listings/${listingId}/${photoId}/${size}.${format}`
}
