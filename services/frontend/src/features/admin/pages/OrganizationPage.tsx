import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Building2, Clock, Percent, Palette, Copy, MapPin, KeyRound, type LucideIcon } from "lucide-react";
import { useTenantInfo } from "@/app/TenantInfoProvider";
import { useTenant } from "@/auth/tenant";
import { useRestaurantUserProfile } from "@/domain/restaurantUserProfile/Provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
function write(p: OrgProfile) { try { localStorage.setItem(LS, JSON.stringify(p)); } catch (e) { console.warn("OrganizationPage: failed to persist profile to localStorage", e); } }

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "R";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function OrganizationPage() {
  const { restaurantName: nameFromTenant, locations } = useTenantInfo();
  const { rid, lid } = useTenant();
  const [model, setModel] = useState<OrgProfile>(() => read());
  const [draft, setDraft] = useState<OrgProfile>(model);

  const rp = useRestaurantUserProfile();
  const { data: joinCode } = rp.useMyJoinCode({ rid: rid ?? undefined, lid: lid ?? undefined }, { enabled: !!rid });

  // If tenant name is known and current model is default/demo, hydrate it for display convenience.
  // Hydrating from async tenant-info data as it resolves, not a derived-state reset.
  useEffect(() => {
    if (nameFromTenant) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (model.restaurantName === DEFAULTS.restaurantName) setModel((m) => ({ ...m, restaurantName: nameFromTenant }));
      if (draft.restaurantName === DEFAULTS.restaurantName) setDraft((d) => ({ ...d, restaurantName: nameFromTenant }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameFromTenant]);

  const isDirty = JSON.stringify(draft) !== JSON.stringify(model);
  const onCancel = () => setDraft(model);
  const onSave = () => { setModel(draft); write(draft); toast.success("Organization settings saved"); };

  const copyJoinLink = () => {
    try {
      navigator.clipboard.writeText(joinCode?.joinUrl ?? "");
      toast.success("Join link copied");
    } catch (e) {
      console.warn("OrganizationPage: failed to copy join link to clipboard", e);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Organization</h2>

      {/* Profile (all org settings — one entity, one save) */}
      <Card className="overflow-hidden py-0">
        <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 space-y-0 bg-brand-soft/40 py-5 border-b">
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-14 w-14 shrink-0 rounded-full bg-brand-soft text-brand-strong grid place-items-center text-lg font-semibold ring-1 ring-brand/20">
              {getInitials(draft.restaurantName)}
            </div>
            <div className="min-w-0">
              <div className="text-base font-semibold text-foreground truncate">{draft.restaurantName || "Your Restaurant"}</div>
              <div className="text-sm text-muted-foreground truncate">Restaurant profile & policies</div>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={onCancel} disabled={!isDirty}>Cancel</Button>
            <Button size="sm" onClick={onSave} disabled={!isDirty}>Save Changes</Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 pt-5">
          <SectionHeading icon={Building2} label="General" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Restaurant Name"><Input value={draft.restaurantName} onChange={(e) => setDraft({ ...draft, restaurantName: e.target.value })} /></Field>
            <Field label="Legal Name"><Input value={draft.legalName} onChange={(e) => setDraft({ ...draft, legalName: e.target.value })} /></Field>
            <Field label="Address"><Input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} /></Field>
            <Field label="Phone"><Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></Field>
          </div>

          <Separator />

          <SectionHeading icon={Clock} label="Hours" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Operating Hours"><Input value={draft.hours} onChange={(e) => setDraft({ ...draft, hours: e.target.value })} /></Field>
          </div>

          <Separator />

          <SectionHeading icon={Percent} label="Taxes & Fees" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Tax Rate (%)"><Input type="number" step="0.01" value={draft.taxRatePct} onChange={(e) => setDraft({ ...draft, taxRatePct: Number(e.target.value) })} /></Field>
            <Field label="Service Fee (%)"><Input type="number" step="0.1" value={draft.serviceFeePct} onChange={(e) => setDraft({ ...draft, serviceFeePct: Number(e.target.value) })} /></Field>
          </div>

          <Separator />

          <SectionHeading icon={Palette} label="Branding" />
          <div className="flex items-center gap-3">
            <div
              className="h-9 w-9 shrink-0 rounded-lg border ring-1 ring-black/5"
              style={{ backgroundColor: draft.brandColor }}
            />
            <Input
              type="color"
              value={draft.brandColor}
              onChange={(e) => setDraft({ ...draft, brandColor: e.target.value })}
              className="h-9 w-24 p-1"
            />
            <span className="text-sm font-mono text-muted-foreground">{draft.brandColor}</span>
          </div>
        </CardContent>
      </Card>

      {/* Join code */}
      {joinCode && (
        <Card className="overflow-hidden py-0">
          <CardHeader className="flex-row items-center gap-3 space-y-0 py-5 border-b">
            <div className="h-9 w-9 shrink-0 rounded-lg bg-primary/10 grid place-items-center">
              <KeyRound className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Team join code</CardTitle>
              <CardDescription>Share with staff to self-join this restaurant</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Restaurant ID"><div className="font-mono text-sm truncate">{joinCode.restaurantId}</div></Field>
              <Field label="Slug"><div className="font-mono text-sm">{joinCode.slug ?? <span className="text-muted-foreground">(none)</span>}</div></Field>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Join link</div>
                <div className="flex items-center gap-2">
                  <Input readOnly value={joinCode.joinUrl ?? "(configure CORS origins)"} />
                  <Button variant="outline" size="icon" onClick={copyJoinLink} disabled={!joinCode.joinUrl} title="Copy link">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Locations (read-only from tenant info for now) */}
      {locations && locations.length > 0 && (
        <Card className="overflow-hidden py-0">
          <CardHeader className="flex-row items-center gap-3 space-y-0 py-5 border-b">
            <div className="h-9 w-9 shrink-0 rounded-lg bg-primary/10 grid place-items-center">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Locations</CardTitle>
              <CardDescription>Locations from your tenant</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {locations.map(l => (
                <div key={l.id} className="rounded-lg border p-3 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${l.isActive ? "bg-status-available" : "bg-muted-foreground"}`} />
                    <span className="font-medium truncate">{l.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{l.isActive ? "Active" : "Inactive"}</div>
                  <div className="text-xs text-muted-foreground">{l.timeZoneId ?? "(no time zone)"}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SectionHeading({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <Icon className="h-3.5 w-3.5" /> {label}
    </div>
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
