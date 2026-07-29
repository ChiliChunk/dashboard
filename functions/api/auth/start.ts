import { requireEnv, type AuthEnv } from "./_shared";

interface RequestContext {
  request: Request;
  env: Partial<AuthEnv>;
}

function isRelativePath(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//");
}

export async function onRequestGet(context: RequestContext): Promise<Response> {
  const { STRAVA_CLIENT_ID } = requireEnv(context.env);
  const url = new URL(context.request.url);
  const returnTo = url.searchParams.get("return_to") ?? "/";

  if (!isRelativePath(returnTo)) {
    return new Response(
      "Paramètre return_to invalide : un chemin relatif est requis.",
      { status: 400 },
    );
  }

  const state = crypto.randomUUID();
  const redirectUri = `${url.origin}/api/auth/callback`;

  const authorizeUrl = new URL("https://www.strava.com/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", STRAVA_CLIENT_ID);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", "activity:read");
  authorizeUrl.searchParams.set("state", state);

  const headers = new Headers({ Location: authorizeUrl.toString() });
  headers.append(
    "Set-Cookie",
    `sdd_state=${state}|${encodeURIComponent(returnTo)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
  );

  return new Response(null, { status: 302, headers });
}
