import * as ImageManipulator from 'expo-image-manipulator'
import type { ImagePickerAsset } from 'expo-image-picker'
import { API_URL } from './apiUrl'

// Long-edge cap for an uploaded listing photo — generous enough for a
// zoomed gallery/certificate close-up (apps/mobile's Galeria viewer), small
// enough that a modern phone camera's 12+ MP original isn't shipped
// untouched. `apps/api`'s POST /media/presign only accepts jpeg/png/webp,
// so this always re-encodes to JPEG regardless of the source format —
// simplest single path, and this is a photo of a gem/listing, not
// something needing transparency.
const MAX_DIMENSION = 1600
const JPEG_COMPRESS_QUALITY = 0.7
const UPLOAD_CONTENT_TYPE = 'image/jpeg'

interface PresignResponse {
  key: string
  uploadUrl: string
}

// Compresses a freshly-picked photo client-side (E1.2's "client-side
// compression" half), then uploads it straight to MinIO via a presigned
// PUT from `POST /media/presign` — no listing needs to exist yet for this
// to work (see that endpoint's own comment): the posting wizard uploads
// each photo as it's picked, and only attaches the resulting storage keys
// to a real listing once one exists. Throws on any failure (presign,
// compress, or the PUT itself) — the caller is responsible for turning
// that into a per-photo error state, not this function.
export async function compressAndUploadPhoto(
  asset: Pick<ImagePickerAsset, 'uri' | 'width' | 'height'>,
  getToken: () => Promise<string | null>,
): Promise<string> {
  const needsResize = Math.max(asset.width, asset.height) > MAX_DIMENSION
  const manipulated = await ImageManipulator.manipulateAsync(
    asset.uri,
    needsResize ? [{ resize: { width: MAX_DIMENSION } }] : [],
    { compress: JPEG_COMPRESS_QUALITY, format: ImageManipulator.SaveFormat.JPEG },
  )

  const token = await getToken()
  if (!token) {
    throw new Error('Not signed in')
  }

  const presignRes = await fetch(`${API_URL}/media/presign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ contentType: UPLOAD_CONTENT_TYPE }),
  })
  if (!presignRes.ok) {
    throw new Error(`Presign failed: ${presignRes.status}`)
  }
  const { key, uploadUrl } = (await presignRes.json()) as PresignResponse

  const blob = await (await fetch(manipulated.uri)).blob()
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': UPLOAD_CONTENT_TYPE },
    body: blob,
  })
  if (!putRes.ok) {
    throw new Error(`Upload failed: ${putRes.status}`)
  }

  return key
}
