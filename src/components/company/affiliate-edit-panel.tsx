"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  generateAffiliateSlug,
  generateLodgifyPromotionName,
  generatePublicCode,
  generateShortId,
} from "@/lib/naming";

type Affiliate = {
  id: string;
  name: string;
  email: string;
  status: string;
};

type Promotion = {
  guest_discount_type: string;
  guest_discount_value: number | string;
  affiliate_payout_type: string;
  affiliate_payout_value: number | string;
  affiliate_payout_base: string;
  status: string;
  internal_notes: string | null;
};

export function AffiliateEditPanel({
  affiliate,
  promotion,
  companySlug,
}: {
  affiliate: Affiliate;
  promotion: Promotion | null;
  companySlug: string;
}) {
  const router = useRouter();
  const initialDiscount = {
    type: (promotion?.guest_discount_type ?? "percent") as "percent" | "fixed",
    value: Number(promotion?.guest_discount_value ?? 10),
  };
  const [form, setForm] = useState({
    name: affiliate.name,
    email: affiliate.email,
    status: affiliate.status,
    guest_discount_type: initialDiscount.type,
    guest_discount_value: initialDiscount.value,
    affiliate_payout_type: (promotion?.affiliate_payout_type ?? "percent") as "percent" | "fixed",
    affiliate_payout_value: Number(promotion?.affiliate_payout_value ?? 10),
    affiliate_payout_base: promotion?.affiliate_payout_base ?? "stay_subtotal",
    promotion_status: promotion?.status ?? "draft",
    internal_notes: promotion?.internal_notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pendingRotation, setPendingRotation] = useState<null | {
    newPublicCode: string;
    newLodgifyName: string;
  }>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function discountChanged() {
    return (
      form.guest_discount_type !== initialDiscount.type ||
      Number(form.guest_discount_value) !== initialDiscount.value
    );
  }

  async function patchEverythingExceptDiscount() {
    const response = await fetch(`/api/affiliates/${affiliate.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        affiliate: {
          name: form.name,
          email: form.email,
          status: form.status as "invited" | "active" | "paused" | "archived",
        },
        promotion: {
          affiliate_payout_type: form.affiliate_payout_type,
          affiliate_payout_value: Number(form.affiliate_payout_value),
          affiliate_payout_base: form.affiliate_payout_base as
            | "stay_subtotal"
            | "booking_total"
            | "total_minus_taxes_fees",
          status: form.promotion_status as "draft" | "active" | "paused" | "expired" | "error",
          internal_notes: form.internal_notes || null,
        },
      }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Update failed.");
  }

  function previewRotation() {
    const affiliateSlug = generateAffiliateSlug(form.name);
    const newDiscount = { type: form.guest_discount_type, value: Number(form.guest_discount_value) };
    const newPublicCode = generatePublicCode(form.name, newDiscount);
    const newLodgifyName = generateLodgifyPromotionName({
      companySlug,
      affiliateSlug,
      guestDiscount: newDiscount,
      affiliatePayout: { type: form.affiliate_payout_type, value: Number(form.affiliate_payout_value) },
      shortId: generateShortId(),
    });
    return { newPublicCode, newLodgifyName };
  }

  async function runRotation(newPublicCode: string, newLodgifyName: string) {
    const response = await fetch(`/api/affiliates/${affiliate.id}/rotate-promotion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        publicCode: newPublicCode,
        lodgifyPromotionName: newLodgifyName,
        newDiscountType: form.guest_discount_type,
        newDiscountValue: Number(form.guest_discount_value),
      }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Rotation failed.");
  }

  async function startSave() {
    setMessage(null);
    if (discountChanged()) {
      setPendingRotation(previewRotation());
      return;
    }
    await commitSave();
  }

  async function commitSave(rotation?: { newPublicCode: string; newLodgifyName: string }) {
    setSaving(true);
    try {
      await patchEverythingExceptDiscount();
      if (rotation) {
        try {
          await runRotation(rotation.newPublicCode, rotation.newLodgifyName);
          setMessage({
            tone: "success",
            text: "Affiliate updated and a new promotion code was issued — the previous code is archived.",
          });
        } catch (rotationError) {
          setMessage({
            tone: "error",
            text:
              rotationError instanceof Error
                ? `Other fields saved, but rotation failed: ${rotationError.message}`
                : "Other fields saved, but rotation failed.",
          });
          return;
        }
      } else {
        setMessage({ tone: "success", text: "Affiliate updated." });
      }
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Update failed." });
    } finally {
      setSaving(false);
      setPendingRotation(null);
    }
  }

  async function commitRemove() {
    setDeleting(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/affiliates/${affiliate.id}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string; archived?: boolean; message?: string };
      if (!response.ok) throw new Error(payload.error ?? "Delete failed.");
      if (payload.archived) {
        setMessage({ tone: "success", text: payload.message ?? "Affiliate archived." });
        router.refresh();
      } else {
        router.push("/company/affiliates");
      }
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Delete failed." });
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Affiliate</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5 md:grid-cols-2">
        <Field label="Name">
          <Input value={form.name} onChange={(e) => update("name", e.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
        </Field>
        <Field label="Affiliate status">
          <Select value={form.status} onChange={(e) => update("status", e.target.value)}>
            <option value="invited">Invited</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="archived">Archived</option>
          </Select>
        </Field>
        <Field label="Promotion status">
          <Select value={form.promotion_status} onChange={(e) => update("promotion_status", e.target.value)}>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="expired">Expired</option>
            <option value="error">Error</option>
          </Select>
        </Field>
        <Field label="Guest discount type">
          <Select
            value={form.guest_discount_type}
            onChange={(e) => update("guest_discount_type", e.target.value as "percent" | "fixed")}
          >
            <option value="percent">Percent</option>
            <option value="fixed">Fixed USD</option>
          </Select>
        </Field>
        <Field label="Guest discount value">
          <Input
            type="number"
            value={form.guest_discount_value}
            onChange={(e) => update("guest_discount_value", Number(e.target.value))}
          />
        </Field>
        <Field label="Affiliate payout type">
          <Select
            value={form.affiliate_payout_type}
            onChange={(e) => update("affiliate_payout_type", e.target.value as "percent" | "fixed")}
          >
            <option value="percent">Percent</option>
            <option value="fixed">Fixed USD</option>
          </Select>
        </Field>
        <Field label="Affiliate payout value">
          <Input
            type="number"
            value={form.affiliate_payout_value}
            onChange={(e) => update("affiliate_payout_value", Number(e.target.value))}
          />
        </Field>
        <Field label="Commission base">
          <Select value={form.affiliate_payout_base} onChange={(e) => update("affiliate_payout_base", e.target.value)}>
            <option value="stay_subtotal">Stay subtotal</option>
            <option value="booking_total">Booking total</option>
            <option value="total_minus_taxes_fees">Total minus taxes and fees</option>
          </Select>
        </Field>
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-slate-700">Internal notes</label>
          <Textarea
            value={form.internal_notes}
            onChange={(e) => update("internal_notes", e.target.value)}
            placeholder="Optional notes for the company team"
          />
        </div>
        {discountChanged() ? (
          <p className="md:col-span-2 text-xs text-amber-700">
            Heads up: changing the guest discount will issue a new public code on save and archive the current one.
          </p>
        ) : null}
        {message ? (
          <p
            className={`md:col-span-2 text-sm ${message.tone === "success" ? "text-emerald-700" : "text-red-600"}`}
          >
            {message.text}
          </p>
        ) : null}
        <div className="md:col-span-2 flex flex-wrap items-center gap-2">
          <Button type="button" onClick={() => void startSave()} disabled={saving}>
            <Save className="h-4 w-4" aria-hidden />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleting}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            {deleting ? "Deleting..." : "Delete Affiliate"}
          </Button>
        </div>
      </CardContent>
      <ConfirmDialog
        open={pendingRotation !== null}
        tone="warning"
        title="Issue a new promotion code?"
        confirmLabel="Rotate and save"
        loading={saving}
        description={
          pendingRotation ? (
            <>
              Changing the guest discount creates a new public code and Lodgify promotion name so historical bookings
              stay attributed to the old code.
              {"\n\n"}
              New public code: <strong>{pendingRotation.newPublicCode}</strong>
              {"\n"}
              New Lodgify promotion: <strong>{pendingRotation.newLodgifyName}</strong>
              {"\n\n"}
              You&apos;ll need to update the matching promotion in Lodgify to the new name.
            </>
          ) : null
        }
        onConfirm={() => pendingRotation && void commitSave(pendingRotation)}
        onCancel={() => setPendingRotation(null)}
      />
      <ConfirmDialog
        open={showDeleteConfirm}
        tone="danger"
        title="Delete this affiliate?"
        confirmLabel="Delete affiliate"
        loading={deleting}
        description="Affiliates with prior commissions are archived instead of deleted so historical attribution is preserved."
        onConfirm={() => void commitRemove()}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}
