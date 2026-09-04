import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTenant } from "@/auth/tenant";
import { useEmployeeDomain } from "@/domain/employee/Provider";
import { useState } from "react";
import { useAuth } from "@/api-authorization/AuthProvider";
import { useRestaurantUserProfile } from "@/domain/restaurantUserProfile/Provider";

export default function RolesPage() {
  const { rid } = useTenant();
  const employee = useEmployeeDomain();
  const roles = employee.useAvailableRoles(rid ?? "", { enabled: !!rid });
  const [openRole, setOpenRole] = useState<string | null>(null);
  const { profile } = useAuth();
  const rp = useRestaurantUserProfile();
  const { data: status } = rp.useOnboardingStatus({ rid: rid ?? undefined }, { retry: 1 });
  const rawRoles = profile?.role;
  const tokenRoles = Array.isArray(rawRoles) ? rawRoles : rawRoles ? [rawRoles] : [];
  const canManage = status?.isAdmin || tokenRoles.includes("Owner") || tokenRoles.includes("Admin");

  return (
    <div className="space-y-4">
      {/* No icon+"Roles & Permissions" title here - the AdminTab sub-nav tab
          above already says that; a card-count and a settings shortcut are
          the only parts of this header that add anything. */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">{roles.data?.length ?? 0} roles</div>
        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          onClick={() => (window.location.href = "/settings/account")}
          title="Open Settings → Account"
        >
          Open Settings
        </Button>
      </header>
      <div className="text-xs text-muted-foreground">Manage your personal account roles under Settings → Account. If the Settings menu is hidden in POS, use the button above.</div>

      {roles.isLoading ? (
        <div className="text-sm text-muted-foreground">Loading roles…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(roles.data ?? []).map((name) => (
            <Card key={name}>
              <CardHeader>
                <CardTitle className="text-base">{name}</CardTitle>
              </CardHeader>
              <CardContent>
                {canManage && (
                  <Button size="sm" variant="outline" onClick={() => setOpenRole(name)}>Manage members</Button>
                )}
              </CardContent>
            </Card>
          ))}
          {roles.data && roles.data.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">No roles available</CardTitle>
                <CardDescription>Roles will appear here when configured</CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      )}

      {canManage && <RoleMembersModal roleName={openRole} onClose={() => setOpenRole(null)} />}
    </div>
  );
}

function RoleMembersModal({ roleName, onClose }: { roleName: string | null; onClose: () => void }) {
  const { rid } = useTenant();
  const employee = useEmployeeDomain();
  const [q, setQ] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const list = employee.useEmployees(
    rid ?? "",
    { q: q || undefined, role: showAll ? undefined : roleName ?? undefined, page, pageSize },
    { enabled: !!rid && !!roleName }
  );

  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Dialog open={!!roleName} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage members: {roleName}</DialogTitle>
        </DialogHeader>
        {!roleName ? null : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
              <div className="grid gap-1.5 md:col-span-2">
                <Label>Search employees</Label>
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="name, email, username" />
              </div>
              <div className="grid gap-1.5">
                <Label>&nbsp;</Label>
                <Button variant="outline" onClick={() => { setPage(1); list.refetch(); }}>Search</Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Showing {showAll ? "all employees" : "current members"}.&nbsp;
              <button className="underline" onClick={() => { setShowAll(v => !v); setPage(1); }}>Switch</button>
            </div>

            <div className="rounded-2xl border p-2 max-h-[420px] overflow-auto">
              {list.isLoading && <div className="p-3 text-sm text-muted-foreground">Loading…</div>}
              {!list.isLoading && items.length === 0 && <div className="p-3 text-sm text-muted-foreground">No employees</div>}
              {!list.isLoading && items.map(e => (
                <RoleMemberRow
                  key={e.userId}
                  rid={rid ?? ""}
                  roleName={roleName}
                  userId={e.userId}
                  displayName={e.displayName || e.userName || "(no name)"}
                  email={e.email ?? "N/A"}
                  hasRole={(e.tenantRoles ?? []).includes(roleName)}
                  onChanged={() => list.refetch()}
                />
              ))}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm opacity-70">{total.toLocaleString()} employees</div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</Button>
                <div className="min-w-[6rem] text-center text-sm">Page {page} / {totalPages}</div>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RoleMemberRow({ rid, roleName, userId, displayName, email, hasRole, onChanged }: {
  rid: string;
  roleName: string;
  userId: string;
  displayName: string;
  email: string;
  hasRole: boolean;
  onChanged: () => void;
}) {
  const employee = useEmployeeDomain();
  const addRoles = employee.useUpdateEmployeeRoles(rid, userId);
  const removeRole = employee.useDeleteEmployeeRole(rid, userId);
  const onAdd = async () => { await addRoles.mutateAsync({ roles: [roleName] }); onChanged(); };
  const onRemove = async () => { await removeRole.mutate(roleName); onChanged(); };
  return (
    <div className="flex items-center justify-between p-2 rounded hover:bg-muted/40">
      <div>
        <div className="text-sm font-medium">{displayName}</div>
        <div className="text-xs text-muted-foreground">{email}</div>
      </div>
      <div>
        {hasRole ? (
          <Button size="sm" variant="destructive" onClick={onRemove} disabled={removeRole.isPending}>Remove</Button>
        ) : (
          <Button size="sm" onClick={onAdd} disabled={addRoles.isPending}>Add</Button>
        )}
      </div>
    </div>
  );
}
