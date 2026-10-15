import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { verifyToken } from '@clerk/backend'
import type { Request } from 'express'

// @clerk/backend doesn't re-export JwtPayload from its public API — derive
// it from verifyToken's own return type instead of guessing an internal path.
type ClerkJwtPayload = Awaited<ReturnType<typeof verifyToken>>

export interface AuthedRequest extends Request {
  auth: ClerkJwtPayload
}

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthedRequest>()
    const token = extractBearerToken(request.headers.authorization)

    if (!token) {
      throw new UnauthorizedException('Missing bearer token')
    }

    try {
      request.auth = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      })
    } catch {
      throw new UnauthorizedException('Invalid or expired token')
    }

    return true
  }
}

export function extractBearerToken(header: string | undefined): string | null {
  if (!header?.startsWith('Bearer ')) {
    return null
  }
  return header.slice('Bearer '.length)
}
