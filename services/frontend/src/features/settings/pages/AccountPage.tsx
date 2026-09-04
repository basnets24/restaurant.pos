import { useMemo, useState } from "react";
import { useAuth } from "@/api-authorization/AuthProvider";
import { isDemoProfile } from "@/auth/demoSession";
import { useTenantInfo } from "@/app/TenantInfoProvider";
import { useTenant } from "@/auth/tenant";
import { useEmployeeDomain } from "@/domain/employee/Provider";
import { useRestaurantUserProfile } from "@/domain/restaurantUserProfile/Provider";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog as Modal, DialogContent as ModalContent, DialogHeader as ModalHeader, DialogTitle as ModalTitle, DialogFooter as ModalFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/apiErrors";
import { cn } from "@/components/ui/utils";
import { Mail, User as UserIcon, MapPin, ShieldCheck, CheckCircle2, XCircle, PencilLine, type LucideIcon } from "lucide-react";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AccountPage() {
  const { profile } = useAuth();
  const { rid } = useTenant();
  const employee = useEmployeeDomain();
  const rp = useRestaurantUserProfile();
  const userId = profile?.sub;
  const employeeDetail = employee.useEmployee(rid ?? "", userId ?? "", { enabled: !!rid && !!userId });
  const { restaurantName, locations } = useTenantInfo();
  const locs = locations ?? [];
  const updateEmp = employee.useUpdateEmployee(rid ?? "", userId ?? "");
  const updateDefaultLoc = employee.useUpdateDefaultLocation(rid ?? "", userId ?? "");
  const currentDefaultLocId = employeeDetail.data?.defaultLocationId ?? "";
  const [defaultLocDraft, setDefaultLocDraft] = useState<string | "">("");
  const [defaultLocError, setDefaultLocError] = useState<string | undefined>();
  const selectedDefaultLoc = defaultLocDraft || currentDefaultLocId;
  const { data: status } = rp.useOnboardingStatus({ rid: rid ?? undefined }, { retry: 1 });
  const rawRoles = profile?.role;
  const tokenRoles = Array.isArray(rawRoles) ? rawRoles : rawRoles ? [rawRoles] : [];
  const canAdmin = status?.isAdmin || tokenRoles.includes("Owner") || tokenRoles.includes("Admin");
  // The demo admin is one shared, persistent seeded account reused by every "Explore staff
  // demo" visitor - DemoAdminGrantValidator looks it up by a hardcoded email, so a demo
  // visitor changing that email or username here would break the demo login for everyone
  // after them, not just their own session. Hide the only path to that edit instead of
  // relying on a server-side check.
  const isDemo = isDemoProfile(profile);

  // Edit employee modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editUserName, setEditUserName] = useState<string>("");
  const [editEmail, setEditEmail] = useState<string>("");
  const [editAccessCode, setEditAccessCode] = useState<string>("");
  const [editError, setEditError] = useState<string | undefined>();
  const onOpenEdit = () => {
    const d = employeeDetail.data;
    setEditUserName(d?.userName ?? "");
    setEditEmail(d?.email ?? "");
    setEditAccessCode("");
    setEditError(undefined);
    setEditOpen(true);
  };
  const onSaveEdit = async () => {
    if (!rid || !userId) return;
    setEditError(undefined);
    try {
      await updateEmp.mutateAsync({
        userName: editUserName || null,
        email: editEmail || null,
        accessCode: editAccessCode || null,
      });
      setEditOpen(false);
    } catch (e: unknown) {
      setEditError(errorMessage(e) ?? "Failed to update profile");
    }
  };
  const display = useMemo(() => {
    const ownerName = profile?.name || [profile?.given_name, profile?.family_name].filter(Boolean).join(" ") || profile?.preferred_username || profile?.email || "User";
    return { ownerName };
  }, [profile]);
  const headerName = employeeDetail.data?.displayName || display.ownerName;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">My Profile</h2>

      {/* Profile (account + employee record — same underlying entity) */}
      <Card className="overflow-hidden py-0">
        <CardHeader className="flex flex-col sm:flex-row items-start justify-between gap-4 space-y-0 bg-brand-soft/40 py-5 border-b">
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-14 w-14 shrink-0 rounded-full bg-brand-soft text-brand-strong grid place-items-center text-lg font-semibold ring-1 ring-brand/20">
              {getInitials(headerName)}
            </div>
            <div className="min-w-0">
              <div className="text-base font-semibold text-foreground truncate">{headerName}</div>
              <div className="text-sm text-muted-foreground truncate">
                {restaurantName ? restaurantName : "Your account"}
              </div>
            </div>
          </div>
          {canAdmin && !isDemo && (
            <Button variant="secondary" size="sm" className="shrink-0 w-full sm:w-auto" onClick={onOpenEdit} disabled={!employeeDetail.data}>
              <PencilLine className="h-3.5 w-3.5" /> Edit Profile
            </Button>
          )}
        </CardHeader>

        <CardContent className="space-y-5 pt-5">
          <div className="grid gap-1.5 max-w-md">
            <label className="text-xs font-medium text-muted-foreground">Display name</label>
            <DisplayNameEditor
              valueFromDetail={employeeDetail.data?.displayName ?? ""}
              onSave={async (name) => {
                if (!rid || !userId) return;
                await updateEmp.mutateAsync({ displayName: name || null });
              }}
            />
          </div>

          {employeeDetail.isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {employeeDetail.data && (
            <>
              <Separator />

              {/* One column below sm - a 2-up grid squeezed values like a
                  full email address down to "admin@p…" on a phone-width
                  card, which is worse than just giving each tile its own
                  row. */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoTile icon={Mail} label="Email" value={employeeDetail.data.email ?? "N/A"} />
                <InfoTile icon={UserIcon} label="User Name" value={employeeDetail.data.userName ?? "N/A"} />
                <InfoTile
                  icon={employeeDetail.data.emailConfirmed ? CheckCircle2 : XCircle}
                  iconClassName={employeeDetail.data.emailConfirmed ? "text-status-available" : "text-muted-foreground"}
                  label="Email Confirmed"
                  value={employeeDetail.data.emailConfirmed ? "Yes" : "No"}
                />
                <InfoTile
                  icon={employeeDetail.data.lockedOut ? XCircle : CheckCircle2}
                  iconClassName={employeeDetail.data.lockedOut ? "text-status-occupied" : "text-status-available"}
                  label="Locked Out"
                  value={employeeDetail.data.lockedOut ? "Yes" : "No"}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" /> Default Location
                </div>
                <div className="text-sm font-medium text-foreground">
                  {(() => {
                    const id = employeeDetail.data?.defaultLocationId ?? null;
                    if (!id) return "N/A";
                    const match = locs.find(l => l.id === id);
                    return match?.name ?? "N/A";
                  })()}
                </div>
                {locs.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                      <Select value={selectedDefaultLoc} onValueChange={(v) => { setDefaultLocDraft(v); setDefaultLocError(undefined); }}>
                        <SelectTrigger className="w-full sm:w-72">
                          <SelectValue placeholder="Change default location" />
                        </SelectTrigger>
                        <SelectContent>
                          {locs.map(l => (
                            <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={async () => {
                          if (!selectedDefaultLoc || selectedDefaultLoc === currentDefaultLocId) return;
                          setDefaultLocError(undefined);
                          try {
                            await updateDefaultLoc.mutateAsync({ defaultLocationId: selectedDefaultLoc });
                            setDefaultLocDraft("");
                          } catch (e: unknown) {
                            setDefaultLocError(errorMessage(e) ?? "Failed to update default location");
                          }
                        }}
                        disabled={updateDefaultLoc.isPending || !selectedDefaultLoc || selectedDefaultLoc === currentDefaultLocId}
                      >Save</Button>
                    </div>
                    {defaultLocError && <div className="text-xs text-destructive">{defaultLocError}</div>}
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" /> Roles
                </div>
                {employeeDetail.data.tenantRoles.length === 0 ? (
                  <div className="text-sm text-muted-foreground">N/A</div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {employeeDetail.data.tenantRoles.map(r => (
                      <Badge key={r} variant="secondary" className="bg-brand-soft text-brand-strong border-transparent">{r}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>

        <div className="px-6 py-3 border-t bg-muted/30 text-xs text-muted-foreground">
          Signed in as {display.ownerName}
        </div>
      </Card>

      {/* Edit Employee Modal */}
      <Modal open={editOpen} onOpenChange={setEditOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Edit Profile</ModalTitle>
          </ModalHeader>
          <div className="grid gap-3 py-2">
            {editError && <div className="text-sm text-destructive">{editError}</div>}
            <label className="text-xs">User name</label>
            <Input value={editUserName} onChange={(e) => setEditUserName(e.target.value)} />
            <label className="text-xs">Email</label>
            <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            <label className="text-xs">Access code (4–6 digits)</label>
            <Input value={editAccessCode} onChange={(e) => setEditAccessCode(e.target.value)} placeholder="Optional" />
          </div>
          <ModalFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={onSaveEdit} disabled={updateEmp.isPending}>Save</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Tenant role management removed from user account page */}

      {/* Removed app-wide system settings from user account page */}
    </div>
  );
}

function InfoTile({ icon: Icon, iconClassName, label, value }: { icon: LucideIcon; iconClassName?: string; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="h-8 w-8 shrink-0 rounded-lg bg-muted grid place-items-center">
        <Icon className={cn("h-4 w-4 text-muted-foreground", iconClassName)} />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-medium text-foreground truncate">{value}</div>
      </div>
    </div>
  );
}

function DisplayNameEditor({ valueFromDetail, onSave }: { valueFromDetail: string; onSave: (name: string) => Promise<void> }) {
  const [name, setName] = useState<string>(valueFromDetail ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | undefined>();
  const [prevValueFromDetail, setPrevValueFromDetail] = useState(valueFromDetail);
  if (valueFromDetail !== prevValueFromDetail) {
    setPrevValueFromDetail(valueFromDetail);
    setName(valueFromDetail ?? "");
  }
  const submit = async () => {
    setMsg(undefined); setSaving(true);
    try { await onSave(name.trim()); setMsg("Saved."); }
    catch (e: unknown) { setMsg(errorMessage(e) ?? "Failed to save"); }
    finally { setSaving(false); }
  };
  return (
    <div className="flex items-center gap-2">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your display name" className="max-w-xs" />
      <Button onClick={submit} disabled={saving}>Save</Button>
      {msg && <div className="text-xs text-muted-foreground ml-2">{msg}</div>}
    </div>
  );
}
