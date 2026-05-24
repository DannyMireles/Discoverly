import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  CheckCircle2,
  Mail,
  ShieldCheck,
  TicketPercent,
  UserPlus,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "How Discoverly Works",
  description: "How affiliates join, get a booking code, connect Stripe, and get paid through Discoverly.",
};

const affiliateSteps = [
  {
    title: "Join from the public link",
    body: "Enter your name and email, then verify the one-time code sent to your inbox.",
    icon: UserPlus,
  },
  {
    title: "Get your booking code",
    body: "Discoverly creates your public guest code and opens your affiliate dashboard.",
    icon: TicketPercent,
  },
  {
    title: "Connect Stripe",
    body: "Complete Stripe setup once so approved payouts can be sent to your account.",
    icon: ShieldCheck,
  },
  {
    title: "Share your code",
    body: "Guests use your code when booking directly. Eligible paid bookings appear in your dashboard.",
    icon: BadgeDollarSign,
  },
];

const ownerSteps = [
  "A new affiliate joins through the public signup link.",
  "Discoverly emails the company owner with the customer code and exact Lodgify promotion name.",
  "The owner manually creates that promotion in Lodgify. The name must match exactly.",
  "After Lodgify syncs paid bookings, Discoverly attributes commissions and prepares payout batches.",
  "The owner reviews and funds a payout batch through Stripe.",
  "After Stripe confirms funding, Discoverly sends transfers to connected affiliate Stripe accounts.",
];

export default function HowItWorksPage() {
  return (
    <AppShell title="How it works" description="Affiliate setup and payout flow." hideNav>
      <div className="mx-auto flex max-w-6xl flex-col gap-10 py-8">
        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#4f5a49]">
                Discoverly affiliate program
              </p>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-[#13151f] sm:text-5xl">
                Direct-booking affiliate tracking, with manual Lodgify promotion setup.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[#40483f]">
                Affiliates can join from a public link, receive a customer code, connect Stripe, and start sharing.
                Company owners still add the matching promotion in Lodgify because that step is completed manually.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/join/ZENCOVE"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#11101f] px-5 py-2 text-sm font-bold text-white shadow-[0_14px_34px_rgba(17,16,31,0.20)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#242139] hover:shadow-[0_20px_44px_rgba(17,16,31,0.32)]"
              >
                Join as an affiliate
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/auth"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/60 bg-white/75 px-5 py-2 text-sm font-bold text-[#1f2024] shadow-[0_10px_28px_rgba(22,21,36,0.08)] backdrop-blur transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_38px_rgba(22,21,36,0.14)]"
              >
                Sign in
              </Link>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-[#3f8147]" aria-hidden />
                Owner notification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-[#4a4f48]">
                When someone joins from the public affiliate link, the company owner receives an email with the exact
                setup details needed in Lodgify.
              </p>
              <div className="rounded-2xl border border-white/70 bg-white/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#596050]">Email includes</p>
                <div className="mt-3 grid gap-3 text-sm font-semibold text-[#17151f]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#3f8147]" aria-hidden />
                    Customer booking code
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#3f8147]" aria-hidden />
                    Exact Lodgify promotion name
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#3f8147]" aria-hidden />
                    Direct link to Lodgify
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#4f5a49]">Affiliate flow</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#13151f]">What affiliates do</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {affiliateSteps.map((step) => (
              <Card key={step.title} className="h-full">
                <CardContent className="space-y-4 p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#11101f] shadow-[0_8px_24px_rgba(22,21,36,0.10)]">
                    <step.icon className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#17151f]">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#4a4f48]">{step.body}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div className="space-y-3">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#4f5a49]">Company workflow</p>
            <h2 className="text-3xl font-semibold tracking-tight text-[#13151f]">What owners do</h2>
            <p className="text-sm leading-6 text-[#40483f]">
              Discoverly tracks the generated code and promotion name. The only manual setup step is creating the
              matching promotion in Lodgify before bookings can be attributed to that affiliate.
            </p>
          </div>
          <Card>
            <CardContent className="p-0">
              <ol className="divide-y divide-white/70">
                {ownerSteps.map((step, index) => (
                  <li key={step} className="grid gap-4 p-5 sm:grid-cols-[3rem_1fr] sm:items-start">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#11101f] text-sm font-bold text-white">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-6 text-[#333a34]">{step}</p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
