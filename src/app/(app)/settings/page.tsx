"use client";

import { useRef, useState } from "react";
import { Download, RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FieldLabel } from "@/components/campaign/field-control";
import { PageBody, PageHeader, PageSkeleton, Panel } from "@/components/shared/page";
import { DATA_VERSION } from "@/lib/data/seed";
import type { CampaignOSData, ExistingParamPolicy } from "@/lib/domain/types";
import { downloadBlob } from "@/lib/io/formats";
import { replaceAllData, resetDemoData, updateSettings, updateUser, useData } from "@/lib/store/store";

function Row({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b py-3 last:border-b-0">
      <div>
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Profile({ data }: { data: CampaignOSData }) {
  const user = data.users.find((u) => u.id === data.settings.currentUserId)!;
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const dirty = name !== user.name || email !== user.email;
  return (
    <Panel title="Profile" description="Shown as campaign owner and in history.">
      <form
        className="grid max-w-xl grid-cols-2 gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          updateUser(user.id, { name: name.trim(), email: email.trim() });
          toast.success("Profile updated");
        }}
      >
        <div>
          <FieldLabel htmlFor="s-name" required>Name</FieldLabel>
          <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="s-email">Email</FieldLabel>
          <Input id="s-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="col-span-2">
          <Button type="submit" disabled={!dirty || !name.trim()}>Save profile</Button>
        </div>
      </form>
    </Panel>
  );
}

export default function SettingsPage() {
  const data = useData();
  const fileRef = useRef<HTMLInputElement>(null);
  if (!data) return <PageSkeleton />;

  return (
    <>
      <PageHeader title="Settings" />
      <PageBody className="max-w-[900px] space-y-5">
        <Profile key={data.settings.currentUserId} data={data} />

        <Panel title="Workspace defaults" bodyClassName="py-1">
          <Row title="Signed in as" description="Switch user to simulate another team member (demo only).">
            <Select value={data.settings.currentUserId} onValueChange={(v) => updateSettings({ currentUserId: v })}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>{data.users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
            </Select>
          </Row>
          <Row title="Existing UTMs fallback" description="Used only when a brand rule doesn’t define a policy.">
            <Select value={data.settings.defaultExistingPolicy} onValueChange={(v) => updateSettings({ defaultExistingPolicy: v as ExistingParamPolicy })}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="replace">Replace tracking parameters</SelectItem>
                <SelectItem value="keep">Keep existing</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Row title="Copy URL after saving" description="Copy the generated campaign URL to the clipboard when a campaign is saved.">
            <Switch checked={data.settings.copyUrlOnSave} onCheckedChange={(v) => updateSettings({ copyUrlOnSave: v })} aria-label="Copy URL after saving" />
          </Row>
          <Row title="Next campaign ID" description="Campaign IDs are allocated sequentially when saved.">
            <span className="font-mono text-sm">C{data.settings.nextCampaignSeq}</span>
          </Row>
        </Panel>

        <Panel title="Integrations" bodyClassName="py-1">
          <Row title="Meta Marketing API" description="Not connected. Campaigns are created manually in Ads Manager from the campaign package.">
            <span className="text-xs text-muted-foreground">Coming later</span>
          </Row>
          <Row title="Google Ads API" description="Not connected. Campaigns are created manually in Google Ads from the campaign package.">
            <span className="text-xs text-muted-foreground">Coming later</span>
          </Row>
        </Panel>

        <Panel title="Data" description="All data is stored in this browser (localStorage)." bodyClassName="py-1">
          <Row title="Back up workspace" description="Download brands, rules, templates and campaigns as JSON.">
            <Button variant="outline" onClick={() => downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), `campaign-os-backup-${new Date().toISOString().slice(0, 10)}.json`)}>
              <Download /> Download backup
            </Button>
          </Row>
          <Row title="Restore from backup" description="Replaces all current data.">
            <>
              <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload /> Restore…</Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  try {
                    const parsed = JSON.parse(await f.text()) as CampaignOSData;
                    if (parsed.version !== DATA_VERSION || !Array.isArray(parsed.brands) || !Array.isArray(parsed.campaigns)) throw new Error();
                    replaceAllData(parsed);
                    toast.success("Workspace restored");
                  } catch {
                    toast.error("That file is not a valid Campaign OS backup.");
                  }
                }}
              />
            </>
          </Row>
          <Row title="Reset demo data" description="Restore the original brands, rules, templates and sample campaigns.">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive"><RotateCcw /> Reset</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset all data?</AlertDialogTitle>
                  <AlertDialogDescription>All campaigns, brands and rule changes in this browser are replaced with the demo data.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={() => { resetDemoData(); toast.success("Demo data restored"); }}>Reset</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Row>
        </Panel>
      </PageBody>
    </>
  );
}
