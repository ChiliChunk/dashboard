import { requireEnv, type AuthEnv } from "./_shared";
import { decrypt } from "./crypto";

interface RequestContext {
  request: Request;
  env: Partial<AuthEnv>;
}

interface StravaRefreshResponse {
  access_token: string;
  expires_at: number;
}

function parseSessionCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)sdd_session=([^;]+)/);
  return match?.[1] ?? null;
}

export async function onRequestPost(context: RequestContext): Promise<Response> {
  const env = requireEnv(context.env);
  const rawSession = parseSessionCookie(context.request.headers.get("Cookie"));
  if (!rawSession) {
    return new Response(null, { status: 401 });
  }

  const separatorIndex = rawSession.indexOf("|");
  if (separatorIndex === -1) {
    return new Response(null, { status: 401 });
  }
  const athleteIdText = rawSession.slice(0, separatorIndex);
  const encryptedRefreshToken = rawSession.slice(separatorIndex + 1);

  let refreshToken: string;
  try {
    refreshToken = await decrypt(encryptedRefreshToken, env.SESSION_ENCRYPTION_KEY);
  } catch {
    return new Response(null, { status: 401 });
  }

  const tokenResponse = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.STRAVA_CLIENT_ID,
      client_secret: env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenResponse.ok) {
    return new Response(null, { status: 401 });
  }

  const refreshed = (await tokenResponse.json()) as StravaRefreshResponse;
  return Response.json({
    accessToken: refreshed.access_token,
    expiresAt: refreshed.expires_at,
    athleteId: Number(athleteIdText),
  });
}
