"use client";

import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/status-badge";
import { TD, TR } from "@/components/ui/table";

export type AffiliateRowProps = {
  affiliateId: string;
  name: string;
  email: string;
  publicCode: string;
  lodgifyPromotionName: string;
  stripeConnected: boolean;
  status: string;
};

export function AffiliateRow(props: AffiliateRowProps) {
  const router = useRouter();
  const href = `/company/affiliates/${props.affiliateId}`;

  function go() {
    router.push(href);
  }

  return (
    <TR
      role="link"
      tabIndex={0}
      onClick={go}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          go();
        }
      }}
      className="cursor-pointer"
    >
      <TD className="font-medium text-slate-950">{props.name}</TD>
      <TD>{props.email}</TD>
      <TD>{props.publicCode}</TD>
      <TD className="font-mono text-xs">{props.lodgifyPromotionName}</TD>
      <TD>
        <StatusBadge status={props.stripeConnected ? "Connected" : "Needs Stripe"} />
      </TD>
      <TD>
        <StatusBadge status={props.status} />
      </TD>
    </TR>
  );
}
