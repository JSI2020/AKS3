import { NextResponse } from "next/server";

/**
 * Auth.js error landing. Shop OAuth must not dump people on /admin/login;
 * staff credential failures must not dump on the storefront.
 */
export function GET(request: Request) {
  const url = new URL(request.url);
  const error = url.searchParams.get("error") ?? "Default";

  const staffErrors = new Set([
    "CredentialsSignin",
    "SessionRequired",
    "Verification",
  ]);

  const target = staffErrors.has(error)
    ? `/admin/login?error=${encodeURIComponent(error)}`
    : `/account/login?error=${encodeURIComponent(error)}`;

  return NextResponse.redirect(new URL(target, url.origin));
}
