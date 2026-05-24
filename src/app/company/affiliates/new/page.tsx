import { AppShell } from "@/components/layout/app-shell";
import { AddAffiliateForm } from "@/components/company/add-affiliate-form";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { getCurrentUserAndCompany } from "@/lib/company/current";
import Link from "next/link";

export default async function NewAffiliatePage() {
  const { user, company, configured } = await getCurrentUserAndCompany();

  return (
    <AppShell title="Add Affiliate" description="Generate customer code, Lodgify promotion name, and invite link.">
      {!configured ? (
        <Banner title="Affiliate setup is temporarily unavailable" tone="warning">
          Please try again shortly or contact support if this continues.
        </Banner>
      ) : !user ? (
        <Banner title="Sign in required" tone="warning" action={<Link href="/auth"><Button>Sign In</Button></Link>}>
          Sign in before adding affiliates.
        </Banner>
      ) : !company ? (
        <Banner title="Company setup needed" tone="warning" action={<Link href="/company/onboarding"><Button>Start Setup</Button></Link>}>
          Complete company setup before adding affiliates.
        </Banner>
      ) : (
        <AddAffiliateForm company={company} />
      )}
    </AppShell>
  );
}
