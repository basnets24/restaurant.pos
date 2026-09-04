import { useMemo, useState } from "react";
import { useTenant } from "@/auth/tenant";
import { useEmployeeDomain } from "@/domain/employee/Provider";
import { useTenantInfo } from "@/app/TenantInfoProvider";
import { useAuth } from "@/api-authorization/AuthProvider";
import { useRestaurantUserProfile } from "@/domain/restaurantUserProfile/Provider";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { errorMessage } from "@/lib/apiErrors";

export default function StaffUsersCard() {
  // Filters & paging
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Tenant + domain hooks
  const { rid } = useTenant();
  const employeeHooks = useEmployeeDomain();
  const { locations } = useTenantInfo();
  const { profile } = useAuth();
  const rp = useRestaurantUserProfile();
  const { data: status } = rp.useOnboardingStatus({ rid: rid ?? undefined }, { retry: 1 });
  const rawRoles = profile?.role;
  const tokenRoles = Array.isArray(rawRoles) ? rawRoles : rawRoles ? [rawRoles] : [];
  const canManage = status?.isAdmin || tokenRoles.includes("Owner") || tokenRoles.includes("Admin");

  // Data via hooks
  const rolesData = employeeHooks.useAvailableRoles(rid ?? "", { enabled: !!rid });
  const { data, isLoading, refetch } = employeeHooks.useEmployees(
    rid ?? "",
    { q: username || undefined, role, page, pageSize },
    { enabled: !!rid }
  );

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    // Borderless/flush on mobile - a card-around-a-card reads as visual
    // clutter once the table below is already its own per-row cards there;
    // sm+ keeps the standard bordered Card frame.
    <Card className="border-0 bg-transparent rounded-none sm:border sm:bg-card sm:rounded-xl">
      {/* No "Employees" / "Manage tenant employees" title block here - the
          page-level "Staff Management" heading (StaffTab) already says the
          same thing, stacking a third repeat of it right underneath was
          just noise, worst on mobile once the card lost its own border. */}
      <CardHeader className="px-0 sm:px-6">
        {/* flex-wrap rather than a rigid single row - at tablet widths (the
            management sidebar leaves less room than it looks like), forcing
            every control onto one line pushed the whole row past the page
            edge instead of the row itself scrolling, taking the entire
            document with it (Add/Filter clipped, no way to reach them). */}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Input
            placeholder="Search name/email/username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full sm:w-64"
          />
          <div className="flex flex-wrap gap-2">
            <Select
              value={role ?? "all"}
              onValueChange={(v) => setRole(v === "all" ? undefined : v)}
            >
              <SelectTrigger className="flex-1 sm:w-auto"><SelectValue placeholder="All roles" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>  {/* ✅ non-empty */}
                {rolesData.data?.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => { setPage(1); refetch(); }}>Filter</Button>
            {canManage && <AddEmployeeButton rid={rid ?? ""} roles={rolesData.data ?? []} locations={locations ?? []} />}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-0 sm:px-6 space-y-4">
        {/* Mobile: one card per employee - a 3-column table has no room to
            breathe below sm, columns were clipping off-screen instead of
            wrapping. */}
        <div className="sm:hidden rounded-2xl border divide-y divide-border">
          {isLoading && <div className="p-4 text-sm text-muted-foreground">Loading…</div>}
          {!isLoading && items.length === 0 && <div className="p-4 text-sm text-muted-foreground">No employees</div>}
          {items.map((e) => (
            <div key={e.userId} className="p-4 flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 shrink-0 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center">
                  {(e.displayName || e.userName || "?").trim()[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{e.displayName || e.userName || "(no name)"}</div>
                  <div className="text-xs opacity-70 truncate">{e.userName}</div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground truncate">{e.email ?? "N/A"}</div>
              {e.tenantRoles && e.tenantRoles.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {e.tenantRoles.map((r) => <Badge key={r} variant="secondary">{r}</Badge>)}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* sm+: table */}
        <div className="hidden sm:block rounded-2xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Tenant Roles</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={3}>Loading…</TableCell></TableRow>
              )}
              {!isLoading && items.length === 0 && (
                <TableRow><TableCell colSpan={3}>No employees</TableCell></TableRow>
              )}
              {items.map((e) => (
                <TableRow key={e.userId}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 shrink-0 rounded-full bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center">
                        {(e.displayName || e.userName || "?").trim()[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{e.displayName || e.userName || "(no name)"}</div>
                        <div className="text-xs opacity-70">{e.userName}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{e.email ?? "N/A"}</TableCell>
                  <TableCell>
                    {(!e.tenantRoles || e.tenantRoles.length === 0) ? "N/A" : (
                      <div className="flex flex-wrap gap-1">
                        {e.tenantRoles.map((r) => <Badge key={r} variant="secondary">{r}</Badge>)}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm opacity-70">{total.toLocaleString()} employees</div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
            <div className="min-w-[6rem] text-center text-sm">Page {page} / {totalPages}</div>
            <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
            <Select value={String(pageSize)} onValueChange={(v) => { setPage(1); setPageSize(parseInt(v)); }}>
              <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n}/page</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AddEmployeeButton({ rid, roles, locations }: { rid: string; roles: readonly string[]; locations: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline">+ Add</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl md:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Employee</DialogTitle>
          </DialogHeader>
          <AddEmployeeForm rid={rid} roles={roles} locations={locations} onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function AddEmployeeForm({ rid, roles, locations, onClose }: { rid: string; roles: readonly string[]; locations: { id: string; name: string }[]; onClose: () => void }) {
  const employee = useEmployeeDomain();
  const add = employee.useAddEmployee(rid);
  const [userId, setUserId] = useState("");
  const [defaultLocationId, setDefaultLocationId] = useState<string | "">("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [error, setError] = useState<string | undefined>();

  const toggleRole = (name: string) => setSelectedRoles((prev) => prev.includes(name) ? prev.filter(r => r !== name) : [...prev, name]);
  const canSubmit = useMemo(() => userId.trim().length > 0, [userId]);

  const submit = async () => {
    setError(undefined);
    if (!canSubmit) { setError("UserId is required"); return; }
    try {
      await add.mutateAsync({
        userId: userId.trim(),
        defaultLocationId: defaultLocationId || null,
        roles: selectedRoles.length > 0 ? selectedRoles : undefined,
      });
      setUserId(""); setDefaultLocationId(""); setSelectedRoles([]);
      onClose();
    } catch (e: unknown) {
      setError(errorMessage(e) ?? "Failed to add employee");
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div className="grid gap-1.5 md:col-span-1">
          <Label>UserId (GUID)</Label>
          <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
        </div>
        <div className="grid gap-1.5 md:col-span-1">
          <Label>Default location (optional)</Label>
          <Select value={defaultLocationId} onValueChange={(v) => setDefaultLocationId(v)}>
            <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
            <SelectContent>
              {locations.map(l => (
                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5 md:col-span-1">
          <Label>Roles (optional)</Label>
          <div className="flex flex-wrap gap-2 p-2 rounded border">
            {roles.length === 0 ? (
              <div className="text-xs text-muted-foreground">No roles</div>
            ) : roles.map(r => (
              <label key={r} className="text-xs inline-flex items-center gap-1">
                <input type="checkbox" checked={selectedRoles.includes(r)} onChange={() => toggleRole(r)} />
                {r}
              </label>
            ))}
          </div>
        </div>
      </div>
      {error && <div className="text-sm text-destructive mt-2">{error}</div>}
      <DialogFooter className="mt-3">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={!canSubmit || add.isPending}>Add Employee</Button>
      </DialogFooter>
    </>
  );
}
