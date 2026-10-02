import Sidebar from "./Sidebar";
import SiteFooter from "./SiteFooter";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas text-ink lg:flex">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-content flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>

        <SiteFooter />
      </div>
    </div>
  );
}
