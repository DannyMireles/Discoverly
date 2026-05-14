"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CopyField } from "@/components/ui/copy-field";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [inviteState, setInviteState] = useState<{ sending: boolean; sent: boolean }>({ sending: false, sent: false });
  const [inviteError, setInviteError] = useState<string | null>(null);
  const lodgifyUrl = process.env.NEXT_PUBLIC_LODGIFY_PROMOTIONS_URL ?? "https://app.lodgify.com";

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
      setSetupDialogOpen(true);
      setMessage("Affiliate saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Affiliate save failed.");
    }
  }

  async function sendInvite() {
    if (!saved?.affiliateId) return;
    setInviteState({ sending: true, sent: false });
    setInviteError(null);
    try {
      const response = await fetch(`/api/affiliates/${saved.affiliateId}/invite`, { method: "POST" });
      const payload = (await response.json()) as { error?: string; inviteUrl?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to send invite.");
      setInviteState({ sending: false, sent: true });
    } catch (error) {
      setInviteState({ sending: false, sent: false });
      setInviteError(error instanceof Error ? error.message : "Failed to send invite.");
    }
  }

  return (
    <div className={saved ? "grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]" : "grid gap-6"}>
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
      {saved ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generated Promo Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <CopyField label="Public customer code" value={saved.publicCode} />
              <CopyField label="Lodgify promotion name" value={saved.lodgifyPromotionName} />
              <CopyField label="Invite link" value={generated.inviteLink} />
              <div className="grid gap-2 pt-2">
                <Button
                  type="button"
                  onClick={() => void sendInvite()}
                  disabled={inviteState.sending}
                >
                  {inviteState.sending
                    ? "Sending..."
                    : inviteState.sent
                      ? "Invite Sent — Send Again"
                      : "Send Invite"}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>
                {inviteState.sent ? (
                  <p className="text-xs text-emerald-700">Invite emailed to {email || "the affiliate"}.</p>
                ) : null}
                {inviteError ? (
                  <p className="text-xs text-red-600 break-words">{inviteError}</p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
      <ConfirmDialog
        open={setupDialogOpen && Boolean(saved)}
        tone="warning"
        title="Add this affiliate in Lodgify"
        confirmLabel="Open Lodgify"
        cancelLabel="Done"
        description={
          saved ? (
            <div className="space-y-4">
              <p>
                Before inviting this affiliate, add the Lodgify promotion below. Discoverly uses this exact promotion
                name to attribute paid bookings and calculate commissions.
              </p>
              <CopyField label="Customer code" value={saved.publicCode} />
              <CopyField label="Lodgify promotion name" value={saved.lodgifyPromotionName} />
            </div>
          ) : null
        }
        onConfirm={() => {
          window.open(lodgifyUrl, "_blank", "noopener,noreferrer");
          setSetupDialogOpen(false);
        }}
        onCancel={() => setSetupDialogOpen(false)}
      />
    </div>
  );
}
