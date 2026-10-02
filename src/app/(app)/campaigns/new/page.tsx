"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { CampaignWizard } from "@/components/campaign/wizard/campaign-wizard";
import { PageSkeleton } from "@/components/shared/page";
import { draftFromParams, type DraftParams } from "@/lib/engine/draft";
import type { CampaignOSData } from "@/lib/domain/types";
import { peekCampaignCode, useData } from "@/lib/store/store";

/** Builds the initial draft once per mount so later store updates never reset the wizard. */
function Wizard({ data, params }: { data: CampaignOSData; params: DraftParams }) {
  const [initial] = useState(() => draftFromParams(data, params, peekCampaignCode(data)));
  return <CampaignWizard data={data} initialDraft={initial.draft} initialStep={initial.step} mode="create" />;
}

function NewCampaign({ data }: { data: CampaignOSData }) {
  const sp = useSearchParams();
  const params: DraftParams = {
    brand: sp.get("brand"),
    platform: sp.get("platform"),
    template: sp.get("template"),
    url: sp.get("url"),
    duplicate: sp.get("duplicate"),
  };
  return <Wizard key={sp.toString()} data={data} params={params} />;
}

export default function NewCampaignPage() {
  const data = useData();
  if (!data) return <PageSkeleton />;
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewCampaign data={data} />
    </Suspense>
  );
}
