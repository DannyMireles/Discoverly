"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyField } from "@/components/ui/copy-field";

export function GenericInviteLinkCard({ companySlug }: { companySlug: string }) {
  const path = `/join/${companySlug}`;
  const [inviteLink, setInviteLink] = useState(path);

  useEffect(() => {
    setInviteLink(`${window.location.origin}${path}`);
  }, [path]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Public Affiliate Link</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <CopyField label="Signup link" value={inviteLink} />
        <Link href={path} target="_blank">
          <Button type="button" variant="secondary">
            Open
            <ExternalLink className="h-4 w-4" aria-hidden />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
