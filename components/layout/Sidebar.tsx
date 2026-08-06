"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Dumbbell,
  Gauge,
  Home as HomeIcon,
  LineChart as LineChartIcon,
  Settings,
  Star,
  User,
} from "lucide-react";

const navItems = [
  { name: "Dashboard", icon: HomeIcon, href: "/" },
  { name: "AFT Calculator", icon: Gauge, href: "/aft-calculator" },
  { name: "Score History", icon: LineChartIcon, href: "/score-history" },
  { name: "Training Plan", icon: Dumbbell, href: "/training-plan" },
  { name: "Workouts", icon: Activity, href: "/workouts" },
  { name: "Profile", icon: User, href: "/profile" },
  { name: "Settings", icon: Settings, href: "/settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-r border-zinc-800 bg-black p-6">
      <nav className="space-y-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex w-full items-center gap-4 rounded-xl px-5 py-4 text-left font-bold uppercase transition ${
                active
                  ? "bg-yellow-400 text-black"
                  : "text-zinc-200 hover:bg-zinc-900 hover:text-yellow-400"
              }`}
            >
              <Icon className="h-6 w-6" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="mt-24 rounded-2xl border border-yellow-500/50 p-6 text-center">
        <h2 className="text-3xl font-black uppercase leading-tight text-yellow-400">
          Be All <br /> You Can Be.
        </h2>
        <p className="mt-4 text-xl font-black uppercase">Army Strong.</p>
        <Star className="mx-auto mt-5 h-14 w-14 text-yellow-400" />
      </div>
    </aside>
  );
}