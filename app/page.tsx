import Image from "next/image";
import Link from "next/link";
import LandingRedirect from "@/components/settings/LandingRedirect";

// The landing page is a browser-only preference, so "/" redirects on the client.
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-canvas p-6 text-sm text-ink-2">
      <LandingRedirect />
      <Image src="/brand/ruckon-logo.png" alt="RuckOn Fitness" width={1200} height={374} sizes="(min-width: 640px) 360px, 80vw" preload className="h-auto w-72 sm:w-90" />
      <p>
        Opening RuckOn Fitness…{" "}
        <Link href="/dashboard" className="text-accent-ink underline">
          Go to the dashboard
        </Link>
      </p>
    </main>
  );
}
