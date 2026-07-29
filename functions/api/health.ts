export async function onRequestGet(): Promise<Response> {
  return new Response("ok", { status: 200 });
}
