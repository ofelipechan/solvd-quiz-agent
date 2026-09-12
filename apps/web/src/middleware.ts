import { NextResponse, type NextRequest } from "next/server";

const AUTH_COOKIE_NAME = "auth_token";

/** Decodes a JWT's payload without verifying the signature (edge runtime has no `jsonwebtoken`). */
function decodeExpiry(token: string): number | null {
  try {
    const [, payload] = token.split(".");
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")) as { exp?: number };
    return typeof decoded.exp === "number" ? decoded.exp : null;
  } catch {
    return null;
  }
}

/**
 * UI-01: redirects unauthenticated (missing or expired-cookie) requests to
 * protected `/quizzes*` pages to `/login`.
 */
export function middleware(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const nowSeconds = Date.now() / 1000;
  const expiry = token ? decodeExpiry(token) : null;
  const isAuthenticated = Boolean(token) && (expiry === null || expiry > nowSeconds);

  if (!isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/quizzes/:path*"],
};
