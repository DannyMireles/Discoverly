"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Select } from "@/components/ui/select";

export function CompanyOnboardingForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    inviteToken: "",
    name: "Zenful Cove",
    slug: "ZENCOVE",
    timezone: "America/Chicago",
    currencyCode: "USD",
    bookingSiteUrl: "https://zenfulcove.com",
    guestDiscountType: "percent",
    guestDiscountValue: "10",
    affiliatePayoutType: "percent",
    affiliatePayoutValue: "10",
    affiliatePayoutBase: "stay_subtotal",
    payoutPayByDay: "3",
  });

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/company/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          guestDiscountValue: Number(form.guestDiscountValue),
          affiliatePayoutValue: Number(form.affiliatePayoutValue),
          payoutPayByDay: Number(form.payoutPayByDay),
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Company setup failed.");
      router.push("/company/settings/lodgify");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Company setup failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-600" aria-hidden />
          Company Details
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-slate-700">Setup code</label>
          <PasswordInput
            value={form.inviteToken}
            onChange={(event) => update("inviteToken", event.target.value)}
            placeholder="Enter your setup code"
            autoComplete="off"
          />
          <p className="mt-1 text-xs text-slate-500">Required to create a new company. Contact your Discoverly contact if you don&apos;t have one.</p>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Company name</label>
          <Input value={form.name} onChange={(event) => update("name", event.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Company link code</label>
          <Input value={form.slug} onChange={(event) => update("slug", event.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Booking site URL</label>
          <Input value={form.bookingSiteUrl} onChange={(event) => update("bookingSiteUrl", event.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Currency</label>
          <Input value={form.currencyCode} onChange={(event) => update("currencyCode", event.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Timezone</label>
          <Select value={form.timezone} onChange={(event) => update("timezone", event.target.value)}>
            <option value="America/Chicago">America/Chicago</option>
            <option value="America/New_York">America/New_York</option>
            <option value="America/Denver">America/Denver</option>
            <option value="America/Los_Angeles">America/Los_Angeles</option>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Pay by day</label>
          <Input value={form.payoutPayByDay} onChange={(event) => update("payoutPayByDay", event.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Guest discount type</label>
          <Select value={form.guestDiscountType} onChange={(event) => update("guestDiscountType", event.target.value)}>
            <option value="percent">Percent</option>
            <option value="fixed">Fixed</option>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Guest discount value</label>
          <Input value={form.guestDiscountValue} onChange={(event) => update("guestDiscountValue", event.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Affiliate payout type</label>
          <Select value={form.affiliatePayoutType} onChange={(event) => update("affiliatePayoutType", event.target.value)}>
            <option value="percent">Percent</option>
            <option value="fixed">Fixed</option>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Affiliate payout value</label>
          <Input value={form.affiliatePayoutValue} onChange={(event) => update("affiliatePayoutValue", event.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-slate-700">Commission base</label>
          <Select value={form.affiliatePayoutBase} onChange={(event) => update("affiliatePayoutBase", event.target.value)}>
            <option value="stay_subtotal">Stay subtotal</option>
            <option value="booking_total">Booking total</option>
            <option value="total_minus_taxes_fees">Total minus taxes and fees</option>
          </Select>
        </div>
        {message ? <p className="text-sm text-red-600 md:col-span-2">{message}</p> : null}
        <div className="md:col-span-2">
          <Button type="button" onClick={submit} disabled={loading}>
            <Save className="h-4 w-4" aria-hidden />
            {loading ? "Saving..." : "Save and Continue"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
