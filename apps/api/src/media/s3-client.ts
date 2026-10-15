import { S3Client } from '@aws-sdk/client-s3'

// Points at the local MinIO container from docker-compose.yml, not real AWS
// — reuses the same MINIO_* vars that service already reads (see
// docker-compose.yml's `minio`/`minio-init` services and .env.example), no
// new env vars needed. `forcePathStyle: true` is required for MinIO (and
// any non-AWS S3-compatible store): the AWS SDK defaults to virtual-hosted
// -style bucket URLs (`https://<bucket>.<endpoint>`), which doesn't resolve
// against a plain `localhost:9000` endpoint. `region` is meaningless to
// MinIO but the SDK requires some value to be set.
export const s3 = new S3Client({
  region: 'us-east-1',
  endpoint: process.env.MINIO_ENDPOINT ?? `http://localhost:${process.env.MINIO_API_PORT ?? 9000}`,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.MINIO_ROOT_USER ?? 'ceylon_gems',
    secretAccessKey: process.env.MINIO_ROOT_PASSWORD ?? 'ceylon_gems_dev',
  },
})

// Raw, seller-uploaded originals — private (no bucket policy), so every
// read goes through a freshly presigned GET rather than a persisted public
// URL — see listing-photos.controller.ts.
export const UPLOADS_BUCKET = 'uploads'

// Resized/re-encoded variants (image-variants.ts) — `minio-init` in
// docker-compose.yml sets this bucket's anonymous access policy to
// `download` (public-read), unlike `uploads`, since these are what the app
// actually displays to buyers and shouldn't need a presigned-URL round
// trip on every render. `MINIO_PUBLIC_URL` defaults to the same local
// endpoint `s3` above uses; it's a separate env var (not reused from the
// `s3` client config) because a real deployment would front this bucket
// with a CDN/public bucket URL that's different from the private
// endpoint/credentials the API talks to internally. A URL built from this
// base is a plain string the API hands back as-is — unlike
// `EXPO_PUBLIC_API_URL`, nothing here rewrites `localhost` for an Android
// emulator; `apps/mobile` doesn't consume this yet (no screen renders a
// real listing's photos), so that's a problem for whenever it does.
export const MEDIA_BUCKET = 'media'
export const MINIO_PUBLIC_URL =
  process.env.MINIO_PUBLIC_URL ?? `http://localhost:${process.env.MINIO_API_PORT ?? 9000}`

export function mediaPublicUrl(objectKey: string) {
  return `${MINIO_PUBLIC_URL}/${MEDIA_BUCKET}/${objectKey}`
}
