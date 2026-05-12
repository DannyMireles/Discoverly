"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

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
}: {
  affiliate: Affiliate;
  promotion: Promotion | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: affiliate.name,
    email: affiliate.email,
    status: affiliate.status,
    guest_discount_type: promotion?.guest_discount_type ?? "percent",
    guest_discount_value: Number(promotion?.guest_discount_value ?? 10),
    affiliate_payout_type: promotion?.affiliate_payout_type ?? "percent",
    affiliate_payout_value: Number(promotion?.affiliate_payout_value ?? 10),
    affiliate_payout_base: promotion?.affiliate_payout_base ?? "stay_subtotal",
    promotion_status: promotion?.status ?? "draft",
    internal_notes: promotion?.internal_notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
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
            guest_discount_type: form.guest_discount_type as "percent" | "fixed",
            guest_discount_value: Number(form.guest_discount_value),
            affiliate_payout_type: form.affiliate_payout_type as "percent" | "fixed",
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
      setMessage({ tone: "success", text: "Affiliate updated." });
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Update failed." });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm("Delete this affiliate? Affiliates with prior commissions are archived instead.")) return;
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
          <Select value={form.guest_discount_type} onChange={(e) => update("guest_discount_type", e.target.value)}>
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
          <Select value={form.affiliate_payout_type} onChange={(e) => update("affiliate_payout_type", e.target.value)}>
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
        {message ? (
          <p
            className={`md:col-span-2 text-sm ${message.tone === "success" ? "text-emerald-700" : "text-red-600"}`}
          >
            {message.text}
          </p>
        ) : null}
        <div className="md:col-span-2 flex flex-wrap items-center gap-2">
          <Button type="button" onClick={() => void save()} disabled={saving}>
            <Save className="h-4 w-4" aria-hidden />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Button type="button" variant="danger" onClick={() => void remove()} disabled={deleting}>
            <Trash2 className="h-4 w-4" aria-hidden />
            {deleting ? "Deleting..." : "Delete Affiliate"}
          </Button>
        </div>
      </CardContent>
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
