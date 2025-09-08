import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/api-authorization/AuthProvider";
import { useTenantInfo } from "@/app/TenantInfoProvider";
import { useTenant } from "@/app/TenantContext";
import { useEmployeeDomain } from "@/domain/employee/Provider";
import { useRestaurantUserProfile } from "@/domain/restaurantUserProfile/Provider";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog as Modal, DialogContent as ModalContent, DialogHeader as ModalHeader, DialogTitle as ModalTitle, DialogFooter as ModalFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User } from "lucide-react";

export default function AccountPage() {
  const { profile } = useAuth();
  const { restaurantName: nameFromTenant } = useTenantInfo();
  const { rid } = useTenant();
  const employee = useEmployeeDomain();
  const rp = useRestaurantUserProfile();
  const userId = (profile as any)?.sub as string | undefined;
  const employeeDetail = employee.useEmployee(rid ?? "", userId ?? "", { enabled: !!rid && !!userId });
  const locs = useTenantInfo().locations ?? [];
  const updateEmp = employee.useUpdateEmployee(rid ?? "", userId ?? "");
  const updateDefaultLoc = employee.useUpdateDefaultLocation(rid ?? "", userId ?? "");
  const [defaultLocDraft, setDefaultLocDraft] = useState<string | "">("");
  const { data: status } = rp.useOnboardingStatus({ rid: rid ?? undefined }, { retry: 1 });
  const rawRoles = (profile as any)?.role as string | string[] | undefined;
  const tokenRoles = Array.isArray(rawRoles) ? rawRoles : rawRoles ? [rawRoles] : [];
  const canAdmin = status?.isAdmin || tokenRoles.includes("Owner") || tokenRoles.includes("Admin");

  // Edit employee modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editUserName, setEditUserName] = useState<string>("");
  const [editDisplayName, setEditDisplayName] = useState<string>("");
  const [editEmail, setEditEmail] = useState<string>("");
  const [editAccessCode, setEditAccessCode] = useState<string>("");
  const [editError, setEditError] = useState<string | undefined>();
  const onOpenEdit = () => {
    const d = employeeDetail.data;
    setEditUserName(d?.userName ?? "");
    setEditDisplayName(d?.displayName ?? "");
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
        displayName: editDisplayName || null,
        email: editEmail || null,
        accessCode: editAccessCode || null,
      });
      setEditOpen(false);
    } catch (e: any) {
      setEditError(e?.message ?? "Failed to update profile");
    }
  };
  const display = useMemo(() => {
    const ownerName = (profile as any)?.name || [ (profile as any)?.given_name, (profile as any)?.family_name ].filter(Boolean).join(" ") || (profile as any)?.preferred_username || (profile as any)?.email || "User";
    return { ownerName };
  }, [profile]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">My Profile</h2>

      {/* Basic profile (display name) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>Update your basic profile</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-1.5 max-w-md">
            <label className="text-xs">Display name</label>
            <DisplayNameEditor
              valueFromDetail={employeeDetail.data?.displayName ?? ""}
              onSave={async (name) => {
                if (!rid || !userId) return;
                await updateEmp.mutateAsync({ displayName: name || null });
              }}
            />
          </div>
          <div className="text-xs text-muted-foreground">Signed in as: {display.ownerName}</div>
        </CardContent>
      </Card>

      {/* Employee (tenant) profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">My Employee Profile</CardTitle>
          <CardDescription>Tenant-specific details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {employeeDetail.isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {employeeDetail.data && (
            <>
              <div className="flex items-start gap-6">
                <div>
                  <div className="text-xs text-muted-foreground">UserId</div>
                  <div className="font-mono text-xs">{employeeDetail.data.userId}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Email</div>
                  <div className="text-sm">{employeeDetail.data.email ?? "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">User Name</div>
                  <div className="text-sm">{employeeDetail.data.userName ?? "—"}</div>
                </div>
              </div>
              <div className="flex items-start gap-6">
                <div>
                  <div className="text-xs text-muted-foreground">Email Confirmed</div>
                  <div className="text-sm">{employeeDetail.data.emailConfirmed ? "Yes" : "No"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Locked Out</div>
                  <div className="text-sm">{employeeDetail.data.lockedOut ? "Yes" : "No"}</div>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="text-xs text-muted-foreground">Default Location</div>
                <div className="text-sm">
                  {(() => {
                    const id = employeeDetail.data?.defaultLocationId ?? null;
                    if (!id) return "—";
                    const match = locs.find(l => l.id === id);
                    return match ? `${match.name} (${id})` : id;
                  })()}
                </div>
                {locs.length > 0 && (
                  <div className="flex items-center gap-2 pt-1">
                    <Select value={defaultLocDraft} onValueChange={(v) => setDefaultLocDraft(v)}>
                      <SelectTrigger className="w-72">
                        <SelectValue placeholder="Change default location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locs.map(l => (
                          <SelectItem key={l.id} value={l.id}>{l.name} ({l.id.slice(0,8)}…)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (!defaultLocDraft) return;
                        try { await updateDefaultLoc.mutateAsync({ defaultLocationId: defaultLocDraft }); setDefaultLocDraft(""); } catch {}
                      }}
                      disabled={updateDefaultLoc.isPending || !defaultLocDraft}
                    >Save</Button>
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Tenant Roles</div>
                {employeeDetail.data.tenantRoles.length === 0 ? (
                  <div className="text-sm">—</div>
                ) : (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {employeeDetail.data.tenantRoles.map(r => <Badge key={r} variant="secondary">{r}</Badge>)}
                  </div>
                )}
              </div>
            </>
          )}

          {canAdmin && (
            <div className="pt-2">
              <Button variant="secondary" onClick={onOpenEdit} disabled={!employeeDetail.data}>Edit Profile</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Employee Modal */}
      <Modal open={editOpen} onOpenChange={setEditOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Edit Profile</ModalTitle>
          </ModalHeader>
          <div className="grid gap-3 py-2">
            {editError && <div className="text-sm text-red-600">{editError}</div>}
            <label className="text-xs">User name</label>
            <Input size="lg" value={editUserName} onChange={(e) => setEditUserName(e.target.value)} />
            <label className="text-xs">Display name</label>
            <Input size="lg" value={editDisplayName} onChange={(e) => setEditDisplayName(e.target.value)} />
            <label className="text-xs">Email</label>
            <Input size="lg" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            <label className="text-xs">Access code (4–6 digits)</label>
            <Input size="lg" value={editAccessCode} onChange={(e) => setEditAccessCode(e.target.value)} placeholder="Optional" />
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

function DisplayNameEditor({ valueFromDetail, onSave }: { valueFromDetail: string; onSave: (name: string) => Promise<void> }) {
  const [name, setName] = useState<string>(valueFromDetail ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | undefined>();
  useEffect(() => { setName(valueFromDetail ?? ""); }, [valueFromDetail]);
  const submit = async () => {
    setMsg(undefined); setSaving(true);
    try { await onSave(name.trim()); setMsg("Saved."); }
    catch (e: any) { setMsg(e?.message ?? "Failed to save"); }
    finally { setSaving(false); }
  };
  return (
    <div className="flex items-center gap-2">
      <Input size="lg" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your display name" className="max-w-xs" />
      <Button onClick={submit} disabled={saving}>Save</Button>
      {msg && <div className="text-xs text-muted-foreground ml-2">{msg}</div>}
    </div>
  );
}
