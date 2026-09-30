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
  { name: "Home", icon: HomeIcon, href: "/" },
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
    <aside className="border-b border-zinc-800 bg-black p-3 lg:border-b-0 lg:border-r lg:p-6">
      <nav className="flex gap-2 overflow-x-auto lg:block lg:space-y-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-left text-sm font-bold uppercase transition lg:w-full lg:gap-4 lg:px-5 lg:py-4 lg:text-base ${
                active
                  ? "bg-yellow-400 text-black"
                  : "text-zinc-200 hover:bg-zinc-900 hover:text-yellow-400"
              }`}
            >
              <Icon className="h-5 w-5 lg:h-6 lg:w-6" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="mt-24 hidden rounded-2xl border border-yellow-500/50 p-6 text-center lg:block">
        <h2 className="text-3xl font-black uppercase leading-tight text-yellow-400">
          Be All <br /> You Can Be.
        </h2>
        <p className="mt-4 text-xl font-black uppercase">Army Strong.</p>
        <Star className="mx-auto mt-5 h-14 w-14 text-yellow-400" />
      </div>
    </aside>
  );
}
