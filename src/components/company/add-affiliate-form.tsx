"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyField } from "@/components/ui/copy-field";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Banner } from "@/components/ui/banner";
import {
  generateAffiliateSlug,
  generateLodgifyPromotionName,
  generatePublicCode,
} from "@/lib/naming";
import type { CurrentCompany } from "@/lib/company/current";

export function AddAffiliateForm({ company }: { company: CurrentCompany }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [guestDiscountType, setGuestDiscountType] = useState<"percent" | "fixed">((company.guest_discount_type as "percent" | "fixed") ?? "percent");
  const [guestDiscountValue, setGuestDiscountValue] = useState(Number(company.guest_discount_value ?? 10));
  const [payoutType, setPayoutType] = useState<"percent" | "fixed">((company.affiliate_payout_type as "percent" | "fixed") ?? "percent");
  const [payoutValue, setPayoutValue] = useState(Number(company.affiliate_payout_value ?? 10));
  const [payoutBase, setPayoutBase] = useState((company.affiliate_payout_base as "stay_subtotal" | "booking_total" | "total_minus_taxes_fees") ?? "stay_subtotal");
  const [publicCode, setPublicCode] = useState("");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState<{ affiliateId: string; lodgifyPromotionName: string; inviteToken: string; publicCode: string } | null>(null);
  const [message, setMessage] = useState("");
  const [inviteState, setInviteState] = useState<{ sending: boolean; sent: boolean }>({ sending: false, sent: false });

  const generated = useMemo(() => {
    const affiliateSlug = generateAffiliateSlug(name);
    const code = generatePublicCode(name, { type: guestDiscountType, value: guestDiscountValue });
    return {
      affiliateSlug,
      code,
      lodgifyPromotionName: generateLodgifyPromotionName({
        companySlug: company.slug,
        affiliateSlug,
        guestDiscount: { type: guestDiscountType, value: guestDiscountValue },
        affiliatePayout: { type: payoutType, value: payoutValue },
        shortId: "A82K",
      }),
      inviteLink: saved?.inviteToken ? `/invite/${saved.inviteToken}` : "Save affiliate to generate invite link",
    };
  }, [company.slug, guestDiscountType, guestDiscountValue, name, payoutType, payoutValue, saved?.inviteToken]);

  async function saveAffiliate() {
    setMessage("");
    setSaved(null);
    try {
      const response = await fetch("/api/affiliates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: company.id,
          companySlug: company.slug,
          name,
          email,
          publicCode: publicCode || generated.code,
          guestDiscountType,
          guestDiscountValue,
          affiliatePayoutType: payoutType,
          affiliatePayoutValue: payoutValue,
          affiliatePayoutBase: payoutBase,
          internalNotes: notes,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        affiliate?: { affiliateId: string; lodgifyPromotionName: string; inviteToken: string; publicCode: string };
      };
      if (!response.ok || !payload.affiliate) throw new Error(payload.error ?? "Affiliate save failed.");
      setSaved(payload.affiliate);
      setInviteState({ sending: false, sent: false });
      setMessage("Affiliate saved. Copy the exact Lodgify promotion name before sending the invite.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Affiliate save failed.");
    }
  }

  async function sendInvite() {
    if (!saved?.affiliateId) {
      setMessage("Save the affiliate before sending the invite.");
      return;
    }
    setInviteState({ sending: true, sent: false });
    try {
      const response = await fetch(`/api/affiliates/${saved.affiliateId}/invite`, { method: "POST" });
      const payload = (await response.json()) as { error?: string; inviteUrl?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to send invite.");
      setInviteState({ sending: false, sent: true });
      setMessage(`Invite emailed to the affiliate. Link: ${payload.inviteUrl ?? ""}`);
    } catch (error) {
      setInviteState({ sending: false, sent: false });
      setMessage(error instanceof Error ? error.message : "Failed to send invite.");
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <Card>
        <CardHeader>
          <CardTitle>Affiliate Details</CardTitle>
          <CardDescription>Public code is editable before save. Lodgify name is generated from the final values.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700">Affiliate name</label>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Affiliate email</label>
            <Input value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Public code</label>
            <Input value={publicCode || generated.code} onChange={(event) => setPublicCode(event.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Affiliate slug</label>
            <Input value={generated.affiliateSlug} readOnly />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Guest discount type</label>
            <Select value={guestDiscountType} onChange={(event) => setGuestDiscountType(event.target.value as "percent" | "fixed")}>
              <option value="percent">Percent</option>
              <option value="fixed">Fixed USD</option>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Guest discount value</label>
            <Input type="number" value={guestDiscountValue} onChange={(event) => setGuestDiscountValue(Number(event.target.value))} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Affiliate payout type</label>
            <Select value={payoutType} onChange={(event) => setPayoutType(event.target.value as "percent" | "fixed")}>
              <option value="percent">Percent</option>
              <option value="fixed">Fixed USD</option>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Affiliate payout value</label>
            <Input type="number" value={payoutValue} onChange={(event) => setPayoutValue(Number(event.target.value))} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Affiliate payout base</label>
            <Select value={payoutBase} onChange={(event) => setPayoutBase(event.target.value as typeof payoutBase)}>
              <option value="stay_subtotal">Stay subtotal</option>
              <option value="booking_total">Booking total</option>
              <option value="total_minus_taxes_fees">Total minus taxes and fees</option>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Expiration date</label>
            <Input type="date" />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Internal notes</label>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional notes for the company team" />
          </div>
          {message ? <p className={saved ? "text-sm text-emerald-700 md:col-span-2" : "text-sm text-red-600 md:col-span-2"}>{message}</p> : null}
          <div className="md:col-span-2">
            <Button type="button" onClick={saveAffiliate}>
              <Save className="h-4 w-4" aria-hidden />
              Save Affiliate
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="space-y-6">
        <Banner title="Create this promotion in Lodgify" tone="warning">
          The Lodgify promotion name must exactly match this value. This is how paid bookings are attributed.
        </Banner>
        <Card>
          <CardHeader>
            <CardTitle>Generated Promo Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CopyField label="Public customer code" value={saved?.publicCode ?? (publicCode || generated.code)} />
            <CopyField label="Lodgify promotion name" value={saved?.lodgifyPromotionName ?? generated.lodgifyPromotionName} />
            <CopyField label="Invite link" value={generated.inviteLink} />
            <div className="grid gap-2 pt-2">
              <Button type="button" variant="secondary">Mark as Created in Lodgify</Button>
              <Button
                type="button"
                onClick={() => void sendInvite()}
                disabled={!saved?.affiliateId || inviteState.sending}
              >
                {inviteState.sending
                  ? "Sending..."
                  : inviteState.sent
                    ? "Invite Sent"
                    : "Send Invite"}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
