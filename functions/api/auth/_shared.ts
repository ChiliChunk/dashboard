export interface AuthEnv {
  STRAVA_CLIENT_ID: string;
  STRAVA_CLIENT_SECRET: string;
  SESSION_ENCRYPTION_KEY: string;
}

const REQUIRED_KEYS = [
  "STRAVA_CLIENT_ID",
  "STRAVA_CLIENT_SECRET",
  "SESSION_ENCRYPTION_KEY",
] as const;

export function requireEnv(env: Partial<AuthEnv>): AuthEnv {
  const missing = REQUIRED_KEYS.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Variables secrètes manquantes : ${missing.join(", ")}. Voir .dev.vars.example.`,
    );
  }
  return env as AuthEnv;
}
