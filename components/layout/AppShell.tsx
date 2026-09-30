import Sidebar from "./Sidebar";
import { aftScoringFile } from "@/lib/aft/scoringFile";
import { aftRulesSource } from "@/lib/aft/rules";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[290px_1fr]">
        <Sidebar />
        <main className="min-w-0 p-4 sm:p-8">
          {children}

          <footer className="mt-12 border-t border-zinc-800 pt-6 text-sm text-zinc-500">
            <p>
              Unofficial tool — not affiliated with or endorsed by the U.S. Army. Scores use the{" "}
              <a href={aftScoringFile.path} className="underline hover:text-yellow-400">
                {aftScoringFile.title}
              </a>{" "}
              (effective {aftScoringFile.effectiveDate}) and pass rules from{" "}
              <a href={aftRulesSource.url} className="underline hover:text-yellow-400">
                {aftRulesSource.publisher} ({aftRulesSource.date})
              </a>
              . Confirm official results with your unit.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
