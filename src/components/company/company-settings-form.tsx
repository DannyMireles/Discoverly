"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, CreditCard, KeyRound, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { CurrentCompany } from "@/lib/company/current";

export function CompanySettingsForm({ company }: { company: CurrentCompany }) {
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState({
    currency: company.currency_code ?? "USD",
    timezone: company.timezone ?? "America/Chicago",
    bookingSiteUrl: company.booking_site_url ?? "",
    guestDiscountType: company.guest_discount_type ?? "percent",
    guestDiscountValue: String(company.guest_discount_value ?? 10),
    payoutType: company.affiliate_payout_type ?? "percent",
    payoutValue: String(company.affiliate_payout_value ?? 10),
    payoutBase: company.affiliate_payout_base ?? "stay_subtotal",
    payByDay: String(company.payout_pay_by_day ?? 3),
  });

  function updateSetting(key: keyof typeof settings, value: string) {
    setSettings((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  async function saveSettings() {
    setMessage("");
    setSaved(false);
    try {
      const response = await fetch("/api/company/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: company.id,
          currencyCode: settings.currency,
          timezone: settings.timezone,
          bookingSiteUrl: settings.bookingSiteUrl,
          guestDiscountType: settings.guestDiscountType,
          guestDiscountValue: Number(settings.guestDiscountValue),
          affiliatePayoutType: settings.payoutType,
          affiliatePayoutValue: Number(settings.payoutValue),
          affiliatePayoutBase: settings.payoutBase,
          payoutPayByDay: Number(settings.payByDay),
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Settings save failed.");
      setSaved(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Settings save failed.");
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600" aria-hidden />
            Company Defaults
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700">Currency</label>
            <Select value={settings.currency} onChange={(event) => updateSetting("currency", event.target.value)}>
              <option value="USD">USD</option>
              <option value="CAD">CAD</option>
              <option value="EUR">EUR</option>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Timezone</label>
            <Select value={settings.timezone} onChange={(event) => updateSetting("timezone", event.target.value)}>
              <option value="America/Chicago">America/Chicago</option>
              <option value="America/New_York">America/New_York</option>
              <option value="America/Denver">America/Denver</option>
              <option value="America/Los_Angeles">America/Los_Angeles</option>
            </Select>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Booking site URL</label>
            <Input value={settings.bookingSiteUrl} onChange={(event) => updateSetting("bookingSiteUrl", event.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Default guest discount type</label>
            <Select value={settings.guestDiscountType} onChange={(event) => updateSetting("guestDiscountType", event.target.value)}>
              <option value="percent">Percent</option>
              <option value="fixed">Fixed</option>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Default guest discount value</label>
            <Input value={settings.guestDiscountValue} onChange={(event) => updateSetting("guestDiscountValue", event.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Default affiliate payout type</label>
            <Select value={settings.payoutType} onChange={(event) => updateSetting("payoutType", event.target.value)}>
              <option value="percent">Percent</option>
              <option value="fixed">Fixed</option>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Default affiliate payout value</label>
            <Input value={settings.payoutValue} onChange={(event) => updateSetting("payoutValue", event.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Commission base</label>
            <Select value={settings.payoutBase} onChange={(event) => updateSetting("payoutBase", event.target.value)}>
              <option value="stay_subtotal">Stay subtotal</option>
              <option value="booking_total">Booking total</option>
              <option value="total_minus_taxes_fees">Total minus taxes and fees</option>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Pay by day of month</label>
            <Input value={settings.payByDay} onChange={(event) => updateSetting("payByDay", event.target.value)} />
          </div>
          <div className="flex items-center gap-3 md:col-span-2">
            <Button type="button" onClick={saveSettings}>
              Save Settings
            </Button>
            {saved ? (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
                <Check className="h-4 w-4" aria-hidden />
                Saved
              </span>
            ) : (
              <span className="text-sm text-slate-500">Click save to apply your changes.</span>
            )}
          </div>
          {message ? <p className="text-sm text-red-600 md:col-span-2">{message}</p> : null}
        </CardContent>
      </Card>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-blue-600" aria-hidden />
              Lodgify
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-slate-600">Save and test the Lodgify key from the Lodgify settings page.</p>
            <Link href="/company/settings/lodgify"><Button>Open Lodgify Settings</Button></Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" aria-hidden />
              Stripe
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-slate-600">Stripe Connect requires live Stripe credentials before redirects and webhook status updates can run.</p>
            <Link href="/company/settings/stripe"><Button>Open Stripe Settings</Button></Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
