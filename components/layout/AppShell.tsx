import Sidebar from "./Sidebar";
import SiteCredit from "./SiteCredit";
import { aftScoringFile } from "@/lib/aft/scoringFile";
import { aftRulesSource } from "@/lib/aft/rules";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas text-ink lg:flex">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>

        <footer className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6 lg:px-8">
          <p className="border-t border-line pt-4 text-xs leading-relaxed text-ink-2">
            Unofficial tool — not affiliated with or endorsed by the U.S. Army. Scores use the{" "}
            <a href={aftScoringFile.path} className="underline underline-offset-2 hover:text-ink">
              {aftScoringFile.title}
            </a>{" "}
            (effective {aftScoringFile.effectiveDate}) and pass rules from{" "}
            <a href={aftRulesSource.url} className="underline underline-offset-2 hover:text-ink">
              {aftRulesSource.publisher} ({aftRulesSource.date})
            </a>
            . Confirm official results with your unit.
          </p>
          <SiteCredit className="mt-2" />
        </footer>
      </div>
    </div>
  );
}
