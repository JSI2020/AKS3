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

/**
 * Behind Caddy the Node server still sees `http://…` even though the client
 * used HTTPS (`x-forwarded-proto`). next-intl then rewrites to an absolute
 * `https://…/en` URL, Next treats that as an external proxy, `/en` redirects
 * back to `/` (localePrefix: never), and the browser/crawler loops forever.
 * Normalize the request URL to the forwarded origin first.
 */
function withForwardedOrigin(req: NextRequest): NextRequest {
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const host = (
    req.headers.get("x-forwarded-host") ?? req.headers.get("host")
  )
    ?.split(",")[0]
    ?.trim();
  if (!proto || !host) return req;

  const canonical = req.nextUrl.clone();
  canonical.protocol = `${proto}:`;
  canonical.host = host;
  if (canonical.href === req.nextUrl.href) return req;

  return new NextRequest(canonical, {
    headers: req.headers,
    method: req.method,
  });
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

/**
 * Pre-launch holding gate. While the storefront isn't live, set the env var
 * COMING_SOON (1 / true / on) and every shop URL serves /coming-soon. Admin,
 * API and Next internals stay reachable so the shop can be run behind the
 * curtain. Unset COMING_SOON (or set it 0) to open the real store — no other
 * change required.
 */
function launchGated(): boolean {
  const v = process.env.COMING_SOON?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "on" || v === "yes";
}

/**
 * Admin: Auth.js JWT gate (matcher historically `/admin` only).
 * Storefront: next-intl (English-only, no locale prefix).
 */
export default auth((req) => {
  const forwarded = withForwardedOrigin(req);
  const { pathname } = forwarded.nextUrl;
  const anonId = ensureAnonId(forwarded);
  const reqWithAnon = withAnonRequest(forwarded, anonId);

  if (
    launchGated() &&
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/auth") &&
    pathname !== "/coming-soon"
  ) {
    const url = forwarded.nextUrl.clone();
    url.pathname = "/coming-soon";
    return stampAnonCookie(
      NextResponse.rewrite(url, {
        request: { headers: reqWithAnon.headers },
      }),
      forwarded,
      anonId,
    );
  }

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth")
  ) {
    return stampAnonCookie(NextResponse.next({
      request: { headers: reqWithAnon.headers },
    }), forwarded, anonId);
  }

  // localePrefix: "never" — keep rewrites/redirects on the same origin as the
  // incoming request. next-intl's middleware emits an absolute https:// rewrite
  // while Node still sees http:// behind Caddy, which Next proxies externally
  // and turns into a / ↔ /en redirect loop.
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    const url = forwarded.nextUrl.clone();
    url.pathname = pathname.replace(/^\/en/, "") || "/";
    return stampAnonCookie(NextResponse.redirect(url), forwarded, anonId);
  }

  const rewriteUrl = forwarded.nextUrl.clone();
  rewriteUrl.pathname = pathname === "/" ? "/en" : `/en${pathname}`;
  return stampAnonCookie(
    NextResponse.rewrite(rewriteUrl, {
      request: { headers: reqWithAnon.headers },
    }),
    forwarded,
    anonId,
  );
});

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};
