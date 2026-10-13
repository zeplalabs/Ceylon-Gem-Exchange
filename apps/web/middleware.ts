import { defaultLocale, isSupportedLocale } from '@ceylon-gems/i18n'
import { NextResponse, type NextRequest } from 'next/server'

// Every real route lives under app/[locale]/ — this redirects anything
// without a supported locale prefix (starting with "/" itself) to
// defaultLocale. Deliberately not sniffing Accept-Language yet to pick
// si/ta for new visitors — same "don't build ahead of what's asked" call
// as everywhere else in this codebase; add it when it's actually wanted,
// matching how LocaleProvider's own device-locale fallback was a real,
// separate task on mobile, not bundled into the first pass there either.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const firstSegment = pathname.split('/')[1]

  if (isSupportedLocale(firstSegment)) {
    return NextResponse.next()
  }

  const url = request.nextUrl.clone()
  url.pathname = `/${defaultLocale}${pathname}`
  return NextResponse.redirect(url)
}

export const config = {
  // Skip Next's own internals and anything that looks like a static file
  // (has a dot in the last path segment) — only real app routes get the
  // locale-prefix check.
  matcher: ['/((?!_next|.*\\..*).*)'],
}
