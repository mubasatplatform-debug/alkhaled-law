/**
 * The upstream identity providers this app offers for sign-in (via the broker).
 *
 * Source of truth for BOTH the server (`server.ts`, one `genericOAuth` provider
 * per entry) and the client (`client.ts` / sign-in buttons). Kept in its own
 * dependency-free module so the client can import it without pulling the
 * server-only Better Auth instance (and `pg`) into the browser bundle.
 *
 * Each app federates to the shared **auth broker** (`GROK_AUTH_ISSUER`), which
 * holds the real Google/X secrets. The app never sees them — it only knows its
 * own per-app client id/secret and which upstream to ask the broker for (`idp`).
 *
 * To add an upstream (e.g. GitHub) once the broker supports it: add one entry
 * here (`{ providerId: "grok-github", idp: "github", label: "GitHub" }`). The
 * `providerId` is this app's local id and the OAuth callback path segment
 * (`/api/auth/oauth2/callback/<providerId>`); `idp` is the hint the broker reads
 * to pick the upstream (Better Auth's id for X is still `twitter`).
 */
export type GrokProvider = {
  /** This app's local provider id; also the callback path segment. */
  providerId: string;
  /** Upstream hint the broker forwards to (Better Auth social id). */
  idp: string;
  /** Human label for the sign-in button. */
  label: string;
};

export const GROK_PROVIDERS: readonly GrokProvider[] = [
  { providerId: "grok-google", idp: "google", label: "Google" },
];

/**
 * Whether sign-in may federate through the broker at all. Its shared
 * live-preview client is meant for the broker's own preview hosts; a deployment
 * with its own public URL (`BETTER_AUTH_URL`) needs a per-app client
 * (`GROK_AUTH_CLIENT_ID`) from the Grok deployer. Without one, the Google button
 * sent visitors to a Google consent screen for the broker's owner (xAI) instead
 * of this office — seen on alkhaled-law.vercel.app on 2026-09-21.
 */
export function brokerUsable(opts: { perAppClientId?: string; publicUrl?: string }): boolean {
  return Boolean(opts.perAppClientId) || !opts.publicUrl;
}
