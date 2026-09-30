"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_SETTINGS, parseSettings } from "@/lib/settings/settings";
import { SETTINGS_KEY } from "@/lib/storage/settings";

export default function LandingRedirect() {
  const router = useRouter();
  useEffect(() => {
    let target: string = DEFAULT_SETTINGS.landingPage;
    try {
      // parseSettings only accepts destinations from LANDING_PAGES.
      target = parseSettings(window.localStorage.getItem(SETTINGS_KEY))?.landingPage ?? target;
    } catch {
      // Storage unavailable: use the default.
    }
    router.replace(target);
  }, [router]);
  return null;
}
