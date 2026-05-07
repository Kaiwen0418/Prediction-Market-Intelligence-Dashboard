"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

type ProductDemoShellProps = {
  barLeft: string;
  barCenter: string;
  barRight: string;
  title: ReactNode;
  footerLabel?: string;
  footerLeft?: string;
  footerRight?: string;
  showHero?: boolean;
  children: ReactNode;
};

function GlobeVisual() {
  return (
    <div className="product-demo-globe" aria-hidden="true">
      <svg viewBox="0 0 560 560" className="h-full w-full">
        <defs>
          <clipPath id="demo-globe-clip">
            <circle cx="280" cy="280" r="170" />
          </clipPath>
        </defs>

        <circle cx="280" cy="280" r="170" fill="none" stroke="rgba(12,12,12,0.18)" strokeWidth="1.2" />

        <g clipPath="url(#demo-globe-clip)" stroke="rgba(12,12,12,0.12)" strokeWidth="1">
          {Array.from({ length: 11 }, (_, index) => {
            const x = 120 + index * 32;
            return <line key={`v-${x}`} x1={x} y1="92" x2={x} y2="468" />;
          })}
          {Array.from({ length: 11 }, (_, index) => {
            const y = 120 + index * 32;
            return <line key={`h-${y}`} x1="92" y1={y} x2="468" y2={y} />;
          })}
          {Array.from({ length: 14 }, (_, index) => {
            const offset = index * 28;
            return <line key={`d1-${offset}`} x1={80 + offset} y1="108" x2={292 + offset} y2="468" />;
          })}
          {Array.from({ length: 14 }, (_, index) => {
            const offset = index * 28;
            return <line key={`d2-${offset}`} x1={468 - offset} y1="108" x2={256 - offset} y2="468" />;
          })}
        </g>

        <g className="product-demo-orbit">
          <path
            d="M188 184 Q 250 104 334 164"
            fill="none"
            stroke="#0c0c0c"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeDasharray="72 120"
          />
          <path
            d="M214 326 Q 282 214 352 288"
            fill="none"
            stroke="#0c0c0c"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="96 140"
          />
          <path
            d="M162 292 Q 214 224 246 192"
            fill="none"
            stroke="#0c0c0c"
            strokeWidth="1.1"
            strokeLinecap="round"
            strokeDasharray="54 110"
          />
        </g>

        <circle cx="322" cy="204" r="4" fill="#0c0c0c" />
        <circle cx="214" cy="326" r="6" fill="#0c0c0c" />
        <circle cx="200" cy="176" r="3.5" fill="#0c0c0c" />
      </svg>
    </div>
  );
}

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/history", label: "Research" }
];

export function ProductDemoShell({
  barLeft,
  barCenter,
  barRight,
  title,
  footerLabel,
  footerLeft,
  footerRight,
  showHero = true,
  children
}: ProductDemoShellProps) {
  const pathname = usePathname();

  return (
    <main className="product-demo-page mx-auto flex min-h-screen max-w-[1500px] flex-col px-4 py-5 md:px-6 lg:px-8">
      <section className="product-demo-hero">
        <div className="product-demo-shell">
          <div className="product-demo-bar">
            <span>{barLeft}</span>
            <span className="text-center">{barCenter}</span>
            <span className="text-right">{barRight}</span>
          </div>

          {showHero ? <GlobeVisual /> : null}

          <div className="product-demo-card">
            <div className={showHero ? "product-demo-stage" : "product-demo-stage product-demo-stage--compact"}>
              <div className="product-demo-card-header">
                <h1 className="product-demo-title">{title}</h1>

                <nav className="product-demo-local-nav" aria-label="Primary navigation">
                  {navLinks.map((link) => (
                    <Link key={link.href} href={link.href} data-active={pathname === link.href ? "true" : "false"}>
                      {link.label}
                    </Link>
                  ))}
                  <ThemeToggle />
                </nav>
              </div>

              {showHero && footerLabel && footerLeft && footerRight ? (
                <div className="product-demo-footer">
                  <div className="product-demo-footer-label">{footerLabel}</div>
                  <p className="product-demo-footer-copy">{footerLeft}</p>
                  <p className="product-demo-footer-copy">{footerRight}</p>
                </div>
              ) : null}
            </div>

            <div className={showHero ? "product-demo-body" : "product-demo-body product-demo-body--compact"}>{children}</div>
          </div>
        </div>
      </section>
    </main>
  );
}
