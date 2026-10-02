import Link from "next/link";
import LandingRedirect from "@/components/settings/LandingRedirect";

// The landing page is a browser-only preference, so "/" redirects on the client.
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-6 text-sm text-ink-2">
      <LandingRedirect />
      <p>
        Opening RuckOn Fitness…{" "}
        <Link href="/dashboard" className="text-accent-ink underline">
          Go to the dashboard
        </Link>
      </p>
    </main>
  );
}
