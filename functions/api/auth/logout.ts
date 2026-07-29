export async function onRequestPost(): Promise<Response> {
  const headers = new Headers();
  headers.append(
    "Set-Cookie",
    "sdd_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
  );
  return new Response(null, { status: 204, headers });
}
