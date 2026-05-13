"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeDollarSign,
  BarChart3,
  CalendarDays,
  Home,
  Menu,
  Settings,
  TicketPercent,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const companyNav = [
  { href: "/company/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/company/affiliates", label: "Affiliates", icon: Users },
  { href: "/company/promotions", label: "Promotions", icon: TicketPercent },
  { href: "/company/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/company/payouts", label: "Payouts", icon: BadgeDollarSign },
  { href: "/company/settings", label: "Settings", icon: Settings },
];

const affiliateNav = [
  { href: "/affiliate/dashboard", label: "Dashboard", icon: Home },
  { href: "/affiliate/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/affiliate/payouts", label: "Payouts", icon: BadgeDollarSign },
  { href: "/affiliate/code", label: "Code", icon: TicketPercent },
  { href: "/affiliate/settings", label: "Settings", icon: Settings },
];

const ONBOARDING_PREFIXES = [
  "/company/onboarding",
  "/company/settings/lodgify",
  "/company/settings/stripe",
  "/affiliate/onboarding",
  "/invite/",
];

function isOnboardingPath(pathname: string | null) {
  if (!pathname) return false;
  return ONBOARDING_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function AppShell({
  children,
  section = "company",
  actions,
  hideNav,
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
  section?: "company" | "affiliate";
  actions?: React.ReactNode;
  hideNav?: boolean;
}) {
  const nav = section === "company" ? companyNav : affiliateNav;
  const switchHref = section === "company" ? "/affiliate/dashboard" : "/company/dashboard";
  const switchLabel = section === "company" ? "Affiliate view" : "Company view";
  const pathname = usePathname();
  const shouldHideNav = hideNav ?? isOnboardingPath(pathname);

  return (
    <div className="min-h-screen text-[#151421]">
      <div className="app-scenic-bg">
        <div className="mx-auto max-w-[1720px] px-5 pb-12 pt-8 sm:px-8 lg:px-14">
          {!shouldHideNav ? (
            <div className="mb-8 flex justify-center overflow-x-auto">
              <div className="rounded-[2rem] border border-white/60 bg-white/55 p-2 shadow-[0_18px_48px_rgba(30,46,48,0.10)] backdrop-blur-xl">
                <nav className="flex items-center gap-2">
                  <Link
                    href={switchHref}
                    className="inline-flex min-h-12 items-center gap-2 rounded-full px-4 text-sm font-bold text-[#1c1f22] transition-all duration-200 ease-out hover:bg-white/75 hover:shadow-[0_8px_20px_rgba(22,21,36,0.08)] sm:hidden"
                  >
                    <Menu className="h-4 w-4" aria-hidden />
                    {switchLabel}
                  </Link>
                  {nav.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "inline-flex min-h-12 items-center gap-2 rounded-full px-4 text-sm font-bold text-[#1c1f22] transition-all duration-200 ease-out hover:bg-white/75 hover:shadow-[0_8px_20px_rgba(22,21,36,0.08)]",
                          active && "bg-white text-[#0d0c21] shadow-[0_12px_32px_rgba(22,21,36,0.14)]",
                        )}
                      >
                        <item.icon className="h-4 w-4" aria-hidden />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </div>
          ) : null}

          {actions ? <div className="mb-6 flex flex-wrap justify-end gap-3">{actions}</div> : null}

          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
