"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CampaignWizard } from "@/components/campaign/wizard/campaign-wizard";
import { EmptyState, PageSkeleton } from "@/components/shared/page";
import { draftFromCampaign } from "@/lib/engine/draft";
import type { WizardStep } from "@/lib/engine/validation";
import { useData } from "@/lib/store/store";

function EditCampaign() {
  const data = useData();
  const { id } = useParams<{ id: string }>();
  const sp = useSearchParams();
  const campaign = data?.campaigns.find((c) => c.id === id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const draft = useMemo(() => (campaign ? draftFromCampaign(campaign) : undefined), [campaign?.id]);

  if (!data) return <PageSkeleton />;
  if (!campaign || !draft)
    return (
      <EmptyState
        icon={SearchX}
        title="Campaign not found"
        description="It may have been deleted."
        action={<Button asChild variant="outline"><Link href="/campaigns">Back to campaigns</Link></Button>}
        className="py-24"
      />
    );

  const stepParam = Number(sp.get("step"));
  const step = (stepParam >= 1 && stepParam <= 6 ? stepParam : 4) as WizardStep;
  return <CampaignWizard data={data} initialDraft={draft} initialStep={step} mode="edit" focusAnchor={sp.get("field") ?? undefined} />;
}

export default function EditCampaignPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EditCampaign />
    </Suspense>
  );
}
