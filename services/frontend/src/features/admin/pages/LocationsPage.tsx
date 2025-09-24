import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin } from "lucide-react";
import { useTenant } from "@/app/TenantContext";
import { useTenantInfo } from "@/app/TenantInfoProvider";
import { useTenantDomain } from "@/domain/tenant/Provider";
import { useAuth } from "@/api-authorization/AuthProvider";
import { useRestaurantUserProfile } from "@/domain/restaurantUserProfile/Provider";

export default function LocationsPage() {
  const { rid } = useTenant();
  const { locations } = useTenantInfo();
  const tenant = useTenantDomain();
  const { profile } = useAuth();
  const rp = useRestaurantUserProfile();
  const { data: status } = rp.useOnboardingStatus({ rid: rid ?? undefined }, { retry: 1 });
  const rawRoles = (profile as any)?.role as string | string[] | undefined;
  const tokenRoles = Array.isArray(rawRoles) ? rawRoles : rawRoles ? [rawRoles] : [];
  const canManage = status?.isAdmin || tokenRoles.includes("Owner") || tokenRoles.includes("Admin");

  // Create location form state
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [timeZoneId, setTimeZoneId] = useState<string>("");
  const [error, setError] = useState<string | undefined>();

  const create = tenant.useCreateLocation(rid ?? "");

  // Update location state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editTz, setEditTz] = useState<string>("");
  const [editActive, setEditActive] = useState<boolean>(true);
  const [editError, setEditError] = useState<string | undefined>();
  const update = tenant.useUpdateLocation(rid ?? "", editingId ?? "");

  const onAdd = async () => {
    setError(undefined);
    if (!rid) { setError("Missing restaurant id"); return; }
    if (!name.trim()) { setError("Location name is required"); return; }
    try {
      await create.mutateAsync({ name: name.trim(), timeZoneId: timeZoneId || null });
      setName("");
      setTimeZoneId("");
      setOpen(false);
    } catch (e: any) {
      setError(e?.message ?? "Failed to create location");
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2"><MapPin className="h-5 w-5" /><h2 className="text-lg font-semibold">Locations</h2></div>
        {canManage && <Button onClick={() => setOpen(v => !v)}>+ Add Location</Button>}
      </header>

      {canManage && open && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create Location</CardTitle>
            <CardDescription>Creates a location for this restaurant</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {error && <div className="text-sm text-red-600">{error}</div>}
            <div className="grid gap-1.5">
              <Label>Location name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Main" />
            </div>
            <div className="grid gap-1.5">
              <Label>Time zone (optional)</Label>
              <Input value={timeZoneId} onChange={(e) => setTimeZoneId(e.target.value)} placeholder="e.g. America/Chicago" />
            </div>
            <div className="pt-2 flex gap-2">
              <Button variant="outline" onClick={() => { setOpen(false); setName(""); setTimeZoneId(""); }}>Cancel</Button>
              <Button onClick={onAdd} disabled={create.isPending}>Create</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(locations ?? []).map(l => {
          const isEditing = editingId === l.id;
          return (
            <Card key={l.id}>
              <CardHeader className="py-3 flex-row items-center justify-between">
                <CardTitle className="text-base">{isEditing ? "Edit Location" : l.name}</CardTitle>
                <div className="flex items-center gap-2">
                  {!isEditing && (
                    <Badge variant={l.isActive?"secondary":"outline"}>{l.isActive ? "Active" : "Inactive"}</Badge>
                  )}
                  {canManage && (
                    isEditing ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setEditingId(null); setEditError(undefined); }}
                          disabled={update.isPending}
                        >Cancel</Button>
                        <Button
                          size="sm"
                          onClick={async () => {
                            setEditError(undefined);
                            if (!rid || !editingId) { setEditError("Missing tenant or location id"); return; }
                            if (!editName.trim()) { setEditError("Name is required"); return; }
                            try {
                              await update.mutateAsync({ name: editName.trim(), isActive: editActive, timeZoneId: editTz || null });
                              setEditingId(null);
                            } catch (e: any) {
                              setEditError(e?.message ?? "Failed to update location");
                            }
                          }}
                          disabled={update.isPending}
                        >Save</Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => { setEditingId(l.id); setEditName(l.name); setEditTz(l.timeZoneId ?? ""); setEditActive(l.isActive); }}>Edit</Button>
                    )
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {isEditing ? (
                  <>
                    {editError && <div className="text-sm text-red-600">{editError}</div>}
                    {canManage ? (
                      <>
                        <div className="grid gap-1.5">
                          <Label>Name</Label>
                          <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                        </div>
                        <div className="grid gap-1.5">
                          <Label>Active</Label>
                          <Select value={editActive ? "true" : "false"} onValueChange={(v) => setEditActive(v === "true") }>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">Active</SelectItem>
                              <SelectItem value="false">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-1.5">
                          <Label>Time Zone (optional)</Label>
                          <Input value={editTz} onChange={(e) => setEditTz(e.target.value)} placeholder="e.g. America/Chicago" />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-sm"><span className="text-muted-foreground">Location Id: </span>{l.id}</div>
                        <div className="text-sm"><span className="text-muted-foreground">Time Zone: </span>{l.timeZoneId ?? "—"}</div>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <div className="text-sm"><span className="text-muted-foreground">Location Id: </span>{l.id}</div>
                    <div className="text-sm"><span className="text-muted-foreground">Time Zone: </span>{l.timeZoneId ?? "—"}</div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
