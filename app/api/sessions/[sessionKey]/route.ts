import { getSession } from "@/lib/openf1/session";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/sessions/[sessionKey]">
) {
  const { sessionKey } = await params;

  try {
    const session = await getSession(Number(sessionKey));
    return Response.json(session);
  } catch {
    return Response.json(
      { error: `No session found for session_key=${sessionKey}` },
      { status: 404 }
    );
  }
}
