import Link from "next/link";
import { SessionWorkspace } from "./SessionWorkspace";

export default async function SessionPage({
  params,
}: PageProps<"/session/[sessionKey]">) {
  const { sessionKey } = await params;

  return (
    <main className="flex flex-1 flex-col gap-4 p-6">
      <Link
        href="/"
        className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        ← Sessions
      </Link>
      <SessionWorkspace sessionKey={Number(sessionKey)} />
    </main>
  );
}
