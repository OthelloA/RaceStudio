import { SessionWorkspace } from "./SessionWorkspace";

export default async function SessionPage({
  params,
}: PageProps<"/session/[sessionKey]">) {
  const { sessionKey } = await params;

  return <SessionWorkspace sessionKey={Number(sessionKey)} />;
}
