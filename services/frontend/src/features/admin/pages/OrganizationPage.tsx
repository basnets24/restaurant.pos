import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Building2, Copy, MapPin, KeyRound, type LucideIcon } from "lucide-react";
import { useTenantInfo } from "@/app/TenantInfoProvider";
import { useTenant } from "@/auth/tenant";
import { useTenantDomain } from "@/domain/tenant/Provider";
import { useAuth } from "@/api-authorization/AuthProvider";
import { useRestaurantUserProfile } from "@/domain/restaurantUserProfile/Provider";
import { errorMessage } from "@/lib/apiErrors";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type OrgProfile = {
  restaurantName: string;
  legalName: string;
  address: string;
  phone: string;
  email: string;
};

const LS = "admin.org.profile.v1";
const DEFAULTS: OrgProfile = {
  restaurantName: "Demo Restaurant",
  legalName: "Demo Restaurant LLC",
  address: "123 Main St, Springfield, USA",
  phone: "(555) 123-4567",
  email: "info@restaurant.local",
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
  const { data: onboardingStatus } = rp.useOnboardingStatus({ rid: rid ?? undefined }, { retry: 1 });
  const { profile } = useAuth();
  const rawRoles = profile?.role;
  const tokenRoles = Array.isArray(rawRoles) ? rawRoles : rawRoles ? [rawRoles] : [];
  const canManageLocations = onboardingStatus?.isAdmin || tokenRoles.includes("Owner") || tokenRoles.includes("Admin");

  const tenantDomain = useTenantDomain();
  const [locOpen, setLocOpen] = useState(false);
  const [locName, setLocName] = useState("");
  const [locTz, setLocTz] = useState<string>("");
  const [locError, setLocError] = useState<string | undefined>();
  const createLocation = tenantDomain.useCreateLocation(rid ?? "");

  const [editingLocId, setEditingLocId] = useState<string | null>(null);
  const [editLocName, setEditLocName] = useState<string>("");
  const [editLocTz, setEditLocTz] = useState<string>("");
  const [editLocActive, setEditLocActive] = useState<boolean>(true);
  const [editLocError, setEditLocError] = useState<string | undefined>();
  const updateLocation = tenantDomain.useUpdateLocation(rid ?? "", editingLocId ?? "");

  const onAddLocation = async () => {
    setLocError(undefined);
    if (!rid) { setLocError("Missing restaurant id"); return; }
    if (!locName.trim()) { setLocError("Location name is required"); return; }
    try {
      await createLocation.mutateAsync({ name: locName.trim(), timeZoneId: locTz || null });
      setLocName("");
      setLocTz("");
      setLocOpen(false);
    } catch (e: unknown) {
      setLocError(errorMessage(e) ?? "Failed to create location");
    }
  };

  const onSaveLocation = async () => {
    setEditLocError(undefined);
    if (!rid || !editingLocId) { setEditLocError("Missing tenant or location id"); return; }
    if (!editLocName.trim()) { setEditLocError("Name is required"); return; }
    try {
      await updateLocation.mutateAsync({ name: editLocName.trim(), isActive: editLocActive, timeZoneId: editLocTz || null });
      setEditingLocId(null);
    } catch (e: unknown) {
      setEditLocError(errorMessage(e) ?? "Failed to update location");
    }
  };

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

      {/* Locations */}
      <Card className="overflow-hidden py-0">
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 py-5 border-b">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 shrink-0 rounded-lg bg-primary/10 grid place-items-center">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Locations</CardTitle>
              <CardDescription>Locations for this restaurant</CardDescription>
            </div>
          </div>
          {canManageLocations && <Button size="sm" onClick={() => setLocOpen(v => !v)}>+ Add Location</Button>}
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          {canManageLocations && locOpen && (
            <div className="rounded-lg border p-3 space-y-3">
              {locError && <div className="text-sm text-destructive">{locError}</div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Location name"><Input value={locName} onChange={(e) => setLocName(e.target.value)} placeholder="Main" /></Field>
                <Field label="Time zone (optional)"><Input value={locTz} onChange={(e) => setLocTz(e.target.value)} placeholder="e.g. America/Chicago" /></Field>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setLocOpen(false); setLocName(""); setLocTz(""); }}>Cancel</Button>
                <Button size="sm" onClick={onAddLocation} disabled={createLocation.isPending}>Create</Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(locations ?? []).map(l => {
              const isEditing = editingLocId === l.id;
              return (
                <div key={l.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {!isEditing && <span className={`w-2 h-2 rounded-full shrink-0 ${l.isActive ? "bg-status-available" : "bg-muted-foreground"}`} />}
                      <span className="font-medium truncate">{isEditing ? "Edit Location" : l.name}</span>
                    </div>
                    {canManageLocations && (
                      isEditing ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button size="sm" variant="outline" onClick={() => { setEditingLocId(null); setEditLocError(undefined); }} disabled={updateLocation.isPending}>Cancel</Button>
                          <Button size="sm" onClick={onSaveLocation} disabled={updateLocation.isPending}>Save</Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setEditingLocId(l.id); setEditLocName(l.name); setEditLocTz(l.timeZoneId ?? ""); setEditLocActive(l.isActive); }}
                        >Edit</Button>
                      )
                    )}
                  </div>
                  {isEditing ? (
                    <>
                      {editLocError && <div className="text-sm text-destructive">{editLocError}</div>}
                      <div className="grid gap-1.5">
                        <Label>Name</Label>
                        <Input value={editLocName} onChange={(e) => setEditLocName(e.target.value)} />
                      </div>
                      <div className="grid gap-1.5">
                        <Label>Active</Label>
                        <Select value={editLocActive ? "true" : "false"} onValueChange={(v) => setEditLocActive(v === "true")}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">Active</SelectItem>
                            <SelectItem value="false">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-1.5">
                        <Label>Time Zone (optional)</Label>
                        <Input value={editLocTz} onChange={(e) => setEditLocTz(e.target.value)} placeholder="e.g. America/Chicago" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-xs text-muted-foreground">{l.isActive ? "Active" : "Inactive"}</div>
                      <div className="text-xs text-muted-foreground">{l.timeZoneId ?? "(no time zone)"}</div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
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
