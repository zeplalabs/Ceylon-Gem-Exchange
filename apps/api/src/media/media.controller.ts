import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'node:crypto'
import { getActingUser } from '../auth/acting-user'
import { AuthedRequest, ClerkAuthGuard } from '../auth/clerk-auth.guard'
import { s3, UPLOADS_BUCKET } from './s3-client'

interface PresignBody {
  contentType?: string
}

// jpeg/png/webp only — matches what expo-image-manipulator (the mobile
// client-side compression step) actually outputs, and keeps the moderation/
// variant-generation steps this bucket eventually feeds (E1.2's still-
// unbuilt second and third checklist items) to a known, small format set.
const CONTENT_TYPE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

// Upload happens before a listing necessarily exists yet — the posting
// wizard compresses and uploads each photo as it's picked, for
// responsiveness, then attaches the resulting keys to the listing once
// it's actually created (see listing-photos.controller.ts's `POST
// /listings/:id/photos`). So this only needs to know *who* is uploading
// (for key namespacing) and *what* they're uploading — not which listing
// it'll end up on, which may not exist yet.
@Controller('media')
export class MediaController {
  @Post('presign')
  @UseGuards(ClerkAuthGuard)
  async presignUpload(@Req() request: AuthedRequest, @Body() body: PresignBody) {
    const actor = await getActingUser(request.auth.sub)
    if (!actor) {
      throw new ForbiddenException('No user record for this account yet')
    }

    const extension = body.contentType ? CONTENT_TYPE_EXTENSIONS[body.contentType] : undefined
    if (!extension) {
      throw new BadRequestException(
        `contentType must be one of: ${Object.keys(CONTENT_TYPE_EXTENSIONS).join(', ')}`,
      )
    }

    const key = `listings/${actor.id}/${randomUUID()}.${extension}`
    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({ Bucket: UPLOADS_BUCKET, Key: key, ContentType: body.contentType }),
      { expiresIn: 300 },
    )

    return { key, uploadUrl, expiresIn: 300 }
  }
}
