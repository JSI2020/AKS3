import { NextRequest, NextResponse } from "next/server";
import NextAuth from "next-auth";

import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export const ANON_COOKIE = "aks_anon";
export const ANON_HEADER = "x-aks-anon";
const ANON_MAX_AGE_S = 60 * 60 * 24 * 90;

function ensureAnonId(req: NextRequest): string {
  const fromCookie = req.cookies.get(ANON_COOKIE)?.value;
  if (fromCookie) return fromCookie;
  return (
    crypto.randomUUID().replace(/-/g, "") +
    crypto.randomUUID().replace(/-/g, "")
  ).slice(0, 32);
}

function withAnonRequest(req: NextRequest, anonId: string): NextRequest {
  const headers = new Headers(req.headers);
  headers.set(ANON_HEADER, anonId);
  return new NextRequest(req, { headers });
}

function stampAnonCookie(
  res: NextResponse,
  req: NextRequest,
  anonId: string,
): NextResponse {
  if (!req.cookies.get(ANON_COOKIE)?.value) {
    res.cookies.set(ANON_COOKIE, anonId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ANON_MAX_AGE_S,
    });
  }
  return res;
}

function launchGated(): boolean {
  const v = process.env.COMING_SOON?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "on" || v === "yes";
}

/**
 * LocalePrefix "never": rewrite with path-only destinations so Next keeps
 * them internal behind Caddy (absolute https URLs were proxied externally
 * and looped with `/en` → `/`).
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const anonId = ensureAnonId(req);
  const reqWithAnon = withAnonRequest(req, anonId);

  if (
    launchGated() &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/auth") &&
    pathname !== "/coming-soon"
  ) {
    return stampAnonCookie(
      NextResponse.rewrite("/coming-soon", {
        request: { headers: reqWithAnon.headers },
      }),
      req,
      anonId,
    );
  }

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth")
  ) {
    return stampAnonCookie(
      NextResponse.next({
        request: { headers: reqWithAnon.headers },
      }),
      req,
      anonId,
    );
  }

  if (pathname === "/en" || pathname.startsWith("/en/")) {
    const dest = pathname.replace(/^\/en/, "") || "/";
    return stampAnonCookie(NextResponse.redirect(dest), req, anonId);
  }

  const destPath = pathname === "/" ? "/en" : `/en${pathname}`;
  return stampAnonCookie(
    NextResponse.rewrite(destPath, {
      request: { headers: reqWithAnon.headers },
    }),
    req,
    anonId,
  );
});

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};
