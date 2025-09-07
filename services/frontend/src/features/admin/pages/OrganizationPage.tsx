import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2 } from "lucide-react";

type OrgProfile = {
  restaurantName: string;
  legalName: string;
  address: string;
  phone: string;
  email: string;
  hours: string;
  taxRatePct: number;
  serviceFeePct: number;
  brandColor: string;
};

const LS = "admin.org.profile.v1";
const DEFAULTS: OrgProfile = {
  restaurantName: "Demo Restaurant",
  legalName: "Demo Restaurant LLC",
  address: "123 Main St, Springfield, USA",
  phone: "(555) 123-4567",
  email: "info@restaurant.local",
  hours: "Mon–Sun: 11:00 AM – 10:00 PM",
  taxRatePct: 8.25,
  serviceFeePct: 0,
  brandColor: "#16a34a",
};

function read(): OrgProfile {
  try { const raw = localStorage.getItem(LS); return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS; } catch { return DEFAULTS; }
}
function write(p: OrgProfile) { try { localStorage.setItem(LS, JSON.stringify(p)); } catch {} }

export default function OrganizationPage() {
  const [tab, setTab] = useState("general");
  const [model, setModel] = useState<OrgProfile>(() => read());
  const [draft, setDraft] = useState<OrgProfile>(model);

  useEffect(() => setDraft(model), [tab]);

  const onCancel = () => setDraft(model);
  const onSave = () => { setModel(draft); write(draft); };

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 grid place-items-center"><Building2 className="h-4 w-4 text-primary" /></div>
        <div>
          <h2 className="text-xl font-semibold">Organization</h2>
          <p className="text-sm text-muted-foreground">Manage your restaurant profile and policies</p>
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 gap-2 rounded-2xl p-2 w-full max-w-lg">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="hours">Hours</TabsTrigger>
          <TabsTrigger value="taxes">Taxes & Fees</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
        </TabsList>

        {/* General */}
        {tab === "general" && (
          <TwoColCard title="Restaurant Profile" desc="Basic contact and identity info">
            <Field label="Restaurant Name"><Input value={draft.restaurantName} onChange={(e) => setDraft({ ...draft, restaurantName: e.target.value })} /></Field>
            <Field label="Legal Name"><Input value={draft.legalName} onChange={(e) => setDraft({ ...draft, legalName: e.target.value })} /></Field>
            <Field label="Address"><Input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} /></Field>
            <Field label="Phone"><Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></Field>
          </TwoColCard>
        )}

        {/* Hours */}
        {tab === "hours" && (
          <TwoColCard title="Operating Hours" desc="Shown to staff and used for reports">
            <Field label="Hours"><Input value={draft.hours} onChange={(e) => setDraft({ ...draft, hours: e.target.value })} /></Field>
          </TwoColCard>
        )}

        {/* Taxes & Fees */}
        {tab === "taxes" && (
          <TwoColCard title="Taxes & Fees" desc="Defaults used for pricing/checkout">
            <Field label="Tax Rate (%)"><Input type="number" step="0.01" value={draft.taxRatePct} onChange={(e) => setDraft({ ...draft, taxRatePct: Number(e.target.value) })} /></Field>
            <Field label="Service Fee (%)"><Input type="number" step="0.1" value={draft.serviceFeePct} onChange={(e) => setDraft({ ...draft, serviceFeePct: Number(e.target.value) })} /></Field>
          </TwoColCard>
        )}

        {/* Branding */}
        {tab === "branding" && (
          <TwoColCard title="Branding" desc="Customize look & feel">
            <Field label="Brand Color"><Input type="color" value={draft.brandColor} onChange={(e) => setDraft({ ...draft, brandColor: e.target.value })} /></Field>
          </TwoColCard>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={onSave}>Save Changes</Button>
        </div>
      </Tabs>
    </div>
  );
}

function TwoColCard({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {desc && <CardDescription>{desc}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}
