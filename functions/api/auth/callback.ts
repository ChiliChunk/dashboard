import { requireEnv, type AuthEnv } from "./_shared";
import { encrypt } from "./crypto";

interface RequestContext {
  request: Request;
  env: Partial<AuthEnv>;
}

interface StravaTokenResponse {
  refresh_token: string;
  athlete: { id: number };
}

interface ParsedStateCookie {
  state: string;
  returnTo: string;
}

function parseStateCookie(cookieHeader: string | null): ParsedStateCookie | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)sdd_state=([^;]+)/);
  const raw = match?.[1];
  if (!raw) return null;
  const [state, encodedReturnTo] = raw.split("|");
  if (!state || !encodedReturnTo) return null;
  return { state, returnTo: decodeURIComponent(encodedReturnTo) };
}

export async function onRequestGet(context: RequestContext): Promise<Response> {
  const env = requireEnv(context.env);
  const url = new URL(context.request.url);
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const receivedState = url.searchParams.get("state");
  const cookieState = parseStateCookie(context.request.headers.get("Cookie"));

  const failureRedirect = (reason: string): Response => {
    const target = new URL(cookieState?.returnTo ?? "/", url.origin);
    target.searchParams.set("auth_error", reason);
    return new Response(null, { status: 302, headers: { Location: target.toString() } });
  };

  if (error) {
    return failureRedirect("refus");
  }
  if (!code || !receivedState || !cookieState || receivedState !== cookieState.state) {
    return failureRedirect("etat_invalide");
  }

  const tokenResponse = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.STRAVA_CLIENT_ID,
      client_secret: env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    return failureRedirect("echange_echoue");
  }

  const tokens = (await tokenResponse.json()) as StravaTokenResponse;
  const encryptedRefreshToken = await encrypt(tokens.refresh_token, env.SESSION_ENCRYPTION_KEY);
  const sessionValue = `${tokens.athlete.id}|${encryptedRefreshToken}`;

  const headers = new Headers({ Location: cookieState.returnTo });
  headers.append(
    "Set-Cookie",
    `sdd_session=${sessionValue}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=15552000`,
  );
  headers.append(
    "Set-Cookie",
    "sdd_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
  );

  return new Response(null, { status: 302, headers });
}
