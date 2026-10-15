import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common'
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { asc, eq, max, sql } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { getActingUser, isModerator } from '../auth/acting-user'
import { AuthedRequest, ClerkAuthGuard } from '../auth/clerk-auth.guard'
import { db } from '../db/client'
import { listingPhotos, listings } from '../db/schema'
import {
  generateImageVariants,
  type GeneratedVariant,
  VARIANT_FORMATS,
  VARIANT_SIZES,
  type VariantFormatName,
  type VariantSizeName,
  variantObjectKey,
} from './image-variants'
import { MEDIA_BUCKET, mediaPublicUrl, s3, UPLOADS_BUCKET } from './s3-client'

interface AttachPhotoBody {
  storageKey?: string
  isCover?: boolean
}

interface UpdatePhotoBody {
  isCover?: boolean
  displayOrder?: number
}

// A GET url is presigned fresh per request rather than ever persisted —
// `uploads` has no bucket policy (private), so this is the only way a
// client ever gets to actually view a photo. Short-lived (1h) is fine
// since the mobile app re-fetches this list whenever it renders a gallery,
// it's not meant to be cached long-term.
const GET_URL_EXPIRES_IN = 60 * 60

async function presignGetUrl(storageKey: string) {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: UPLOADS_BUCKET, Key: storageKey }), {
    expiresIn: GET_URL_EXPIRES_IN,
  })
}

// Deterministic from (listingId, photoId) — the `media` bucket's object
// keys are computed with the exact same variantObjectKey() both when a
// variant is uploaded (attachPhoto) and whenever one is read back, so no
// URL/key ever needs to be persisted in `listing_photos` itself. Public
// URLs (not presigned), since `media` has an anonymous-download policy
// (docker-compose.yml's minio-init) unlike `uploads`.
function photoVariantUrls(listingId: string, photoId: string) {
  return Object.fromEntries(
    VARIANT_SIZES.map((size) => [
      size.name,
      Object.fromEntries(
        VARIANT_FORMATS.map((format) => [
          format,
          mediaPublicUrl(variantObjectKey(listingId, photoId, size.name, format)),
        ]),
      ),
    ]),
  ) as Record<VariantSizeName, Record<VariantFormatName, string>>
}

async function uploadVariants(listingId: string, photoId: string, variants: GeneratedVariant[]) {
  await Promise.all(
    variants.map((variant) =>
      s3.send(
        new PutObjectCommand({
          Bucket: MEDIA_BUCKET,
          Key: variantObjectKey(listingId, photoId, variant.size, variant.format),
          Body: variant.buffer,
          ContentType: variant.contentType,
        }),
      ),
    ),
  )
}

// Best-effort, same reasoning as deletePhoto's original-object delete
// below — an orphaned `media` object with no DB row is just never linked
// to from anywhere, not a correctness problem.
async function deleteVariants(listingId: string, photoId: string) {
  await Promise.all(
    VARIANT_SIZES.flatMap((size) =>
      VARIANT_FORMATS.map((format) =>
        s3
          .send(
            new DeleteObjectCommand({
              Bucket: MEDIA_BUCKET,
              Key: variantObjectKey(listingId, photoId, size.name, format),
            }),
          )
          .catch(() => {}),
      ),
    ),
  )
}

async function findListingOr404(listingId: string) {
  const [listing] = await db.select().from(listings).where(eq(listings.id, listingId)).limit(1)
  if (!listing || listing.status === 'removed') {
    throw new NotFoundException(`No listing with id ${listingId}`)
  }
  return listing
}

// Nested under /listings/:id/photos rather than a flat /photos/:id —
// every operation here is scoped to one listing (ownership is checked via
// the parent listing's sellerId, there's no independent photo-level
// permission), so the URL shape matches that.
@Controller('listings/:listingId/photos')
export class ListingPhotosController {
  @Get()
  async getPhotos(@Param('listingId') listingId: string) {
    await findListingOr404(listingId)

    const rows = await db
      .select()
      .from(listingPhotos)
      .where(eq(listingPhotos.listingId, listingId))
      .orderBy(asc(listingPhotos.displayOrder))

    return Promise.all(
      rows.map(async (row) => ({
        ...row,
        url: await presignGetUrl(row.storageKey),
        variants: photoVariantUrls(listingId, row.id),
      })),
    )
  }

  // Attaches an object already uploaded via `POST /media/presign` — this
  // doesn't accept file bytes itself, it just records that `storageKey`
  // belongs to this listing. Fetches the original's bytes from `uploads`
  // (which also doubles as the "does this key actually exist" check a
  // separate HeadObject call used to do) and runs them through
  // generateImageVariants() before anything is persisted — the DB row
  // only gets created once the original is confirmed to exist *and* every
  // variant has been generated and uploaded to `media`, so a photo row
  // never ends up pointing at variants that don't exist.
  @Post()
  @UseGuards(ClerkAuthGuard)
  async attachPhoto(
    @Req() request: AuthedRequest,
    @Param('listingId') listingId: string,
    @Body() body: AttachPhotoBody,
  ) {
    const actor = await getActingUser(request.auth.sub)
    if (!actor) {
      throw new ForbiddenException('No user record for this account yet')
    }
    if (!body.storageKey?.trim()) {
      throw new BadRequestException('storageKey is required')
    }

    const listing = await findListingOr404(listingId)
    if (listing.sellerId !== actor.id && !isModerator(actor.role)) {
      throw new ForbiddenException('Not the owner of this listing')
    }

    let originalBuffer: Buffer
    try {
      const original = await s3.send(
        new GetObjectCommand({ Bucket: UPLOADS_BUCKET, Key: body.storageKey }),
      )
      originalBuffer = Buffer.from(await original.Body!.transformToByteArray())
    } catch {
      throw new BadRequestException(
        'storageKey was not found — upload it via POST /media/presign first',
      )
    }

    let variants: GeneratedVariant[]
    try {
      variants = await generateImageVariants(originalBuffer)
    } catch {
      throw new BadRequestException('Could not process the uploaded file as an image')
    }

    if (body.isCover) {
      await db
        .update(listingPhotos)
        .set({ isCover: false, updatedAt: new Date() })
        .where(eq(listingPhotos.listingId, listingId))
    }

    const orderRows = await db
      .select({ nextOrder: sql<number>`coalesce(${max(listingPhotos.displayOrder)}, -1) + 1` })
      .from(listingPhotos)
      .where(eq(listingPhotos.listingId, listingId))
    const nextOrder = orderRows[0]!.nextOrder

    const photoId = randomUUID()
    await uploadVariants(listingId, photoId, variants)

    const insertedRows = await db
      .insert(listingPhotos)
      .values({
        id: photoId,
        listingId,
        storageKey: body.storageKey,
        isCover: body.isCover ?? false,
        displayOrder: nextOrder,
      })
      .returning()
    const row = insertedRows[0]!

    return {
      ...row,
      url: await presignGetUrl(row.storageKey),
      variants: photoVariantUrls(listingId, row.id),
    }
  }

  @Patch(':photoId')
  @UseGuards(ClerkAuthGuard)
  async updatePhoto(
    @Req() request: AuthedRequest,
    @Param('listingId') listingId: string,
    @Param('photoId') photoId: string,
    @Body() body: UpdatePhotoBody,
  ) {
    const actor = await getActingUser(request.auth.sub)
    if (!actor) {
      throw new ForbiddenException('No user record for this account yet')
    }

    const listing = await findListingOr404(listingId)
    if (listing.sellerId !== actor.id && !isModerator(actor.role)) {
      throw new ForbiddenException('Not the owner of this listing')
    }

    const [photo] = await db
      .select()
      .from(listingPhotos)
      .where(eq(listingPhotos.id, photoId))
      .limit(1)
    if (!photo || photo.listingId !== listingId) {
      throw new NotFoundException(`No photo with id ${photoId} on listing ${listingId}`)
    }

    if (body.isCover) {
      await db
        .update(listingPhotos)
        .set({ isCover: false, updatedAt: new Date() })
        .where(eq(listingPhotos.listingId, listingId))
    }

    const updatedRows = await db
      .update(listingPhotos)
      .set({
        ...(body.isCover !== undefined && { isCover: body.isCover }),
        ...(body.displayOrder !== undefined && { displayOrder: body.displayOrder }),
        updatedAt: new Date(),
      })
      .where(eq(listingPhotos.id, photoId))
      .returning()
    const updated = updatedRows[0]!

    return {
      ...updated,
      url: await presignGetUrl(updated.storageKey),
      variants: photoVariantUrls(listingId, updated.id),
    }
  }

  @Delete(':photoId')
  @UseGuards(ClerkAuthGuard)
  async deletePhoto(
    @Req() request: AuthedRequest,
    @Param('listingId') listingId: string,
    @Param('photoId') photoId: string,
  ) {
    const actor = await getActingUser(request.auth.sub)
    if (!actor) {
      throw new ForbiddenException('No user record for this account yet')
    }

    const listing = await findListingOr404(listingId)
    if (listing.sellerId !== actor.id && !isModerator(actor.role)) {
      throw new ForbiddenException('Not the owner of this listing')
    }

    const [photo] = await db
      .select()
      .from(listingPhotos)
      .where(eq(listingPhotos.id, photoId))
      .limit(1)
    if (!photo || photo.listingId !== listingId) {
      throw new NotFoundException(`No photo with id ${photoId} on listing ${listingId}`)
    }

    await db.delete(listingPhotos).where(eq(listingPhotos.id, photoId))
    // Best-effort — an orphaned MinIO object with no DB row is harmless
    // (never presigned, never shown), so a storage-side failure here
    // shouldn't turn into a 500 after the DB row is already gone.
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: UPLOADS_BUCKET, Key: photo.storageKey }))
    } catch {
      // ignored — see comment above
    }
    await deleteVariants(listingId, photoId)

    return { deleted: true }
  }
}
