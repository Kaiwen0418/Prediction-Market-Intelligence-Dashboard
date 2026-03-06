import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const links = [
  { href: "/", label: "Overview" },
  { href: "/market", label: "Market" },
  { href: "/history", label: "History" },
  { href: "/timeline", label: "Timeline" }
];

export function TopNav() {
  return (
    <nav className="panel sticky top-4 z-20 px-4 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="metric-label">PM Intelligence</p>
          <p className="mt-1 text-sm text-slate-600">Frontend data pipeline, analytics, and realtime market views</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              {link.label}
            </Link>
          ))}
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
