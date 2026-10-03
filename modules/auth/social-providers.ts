import type { SocialProvider } from "@/modules/account/customer-login-form";

/**
 * Storefront sign-in channels that are actually usable, decided by env.
 * Dead OAuth buttons are never offered as live actions.
 *
 * Env:
 *   Google    → AUTH_GOOGLE_ID + AUTH_GOOGLE_SECRET
 *   Facebook  → AUTH_FACEBOOK_ID + AUTH_FACEBOOK_SECRET
 *   WhatsApp  → WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID + AKS_WHATSAPP_LOGIN=1
 *
 * Instagram Login Kit and TikTok Login Kit are not wired yet — the UI may
 * show them as "Soon" so the intended house set is visible without fake OAuth.
 */
export function configuredSocialProviders(): SocialProvider[] {
  const providers: SocialProvider[] = [];
  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
    providers.push("google");
  }
  if (process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET) {
    providers.push("facebook");
  }
  return providers;
}

export function whatsappLoginEnabled(): boolean {
  return (
    process.env.AKS_WHATSAPP_LOGIN === "1" &&
    !!process.env.WHATSAPP_ACCESS_TOKEN &&
    !!process.env.WHATSAPP_PHONE_NUMBER_ID
  );
}

/** Preferred channel order on the Quiet Luxury sign-in panel. */
export type AuthChannelKey =
  | "whatsapp"
  | "facebook"
  | "instagram"
  | "tiktok"
  | "google";

export type AuthChannelState = {
  key: AuthChannelKey;
  /** Live = wired provider; soon = designed but not configured yet. */
  status: "live" | "soon";
};

export function storefrontAuthChannels(): AuthChannelState[] {
  const social = new Set(configuredSocialProviders());
  const whatsapp = whatsappLoginEnabled();

  return [
    { key: "whatsapp", status: whatsapp ? "live" : "soon" },
    { key: "facebook", status: social.has("facebook") ? "live" : "soon" },
    { key: "instagram", status: "soon" },
    { key: "tiktok", status: "soon" },
    ...(social.has("google")
      ? [{ key: "google" as const, status: "live" as const }]
      : []),
  ];
}
