import { SessionBrowser } from "@/components/session-browser/SessionBrowser";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        Telemetry Studio
      </h1>
      <SessionBrowser />
    </main>
  );
}
