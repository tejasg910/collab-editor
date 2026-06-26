import { NextRequest, NextResponse } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

const PUBLIC_PATHS = ["/login", "/register", "/api/auth"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = pathname === "/" || PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  const session = getSessionCookie(request)

  if (!session && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (session && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}
