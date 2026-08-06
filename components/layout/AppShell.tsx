import Sidebar from "./Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="grid min-h-screen lg:grid-cols-[290px_1fr]">
        <Sidebar />
        <section className="p-8">{children}</section>
      </div>
    </main>
  );
}