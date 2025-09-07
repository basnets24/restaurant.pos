import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Users, Pencil, Trash2, Shield } from "lucide-react";

type Role = { id: string; name: string; members: number; description?: string; updatedAt: string; permissions: string[] };
const LS = "admin.roles.v1";

const SAMPLE: Role[] = [
  { id: "1", name: "Manager", members: 4, description: "Full access to management", updatedAt: new Date().toISOString(), permissions: ["orders:read","orders:write","tables:manage","staff:manage"] },
  { id: "2", name: "Server", members: 12, description: "Take orders and payments", updatedAt: new Date().toISOString(), permissions: ["orders:read","orders:write","tables:read"] },
  { id: "3", name: "Host", members: 3, description: "Seat guests, manage tables", updatedAt: new Date().toISOString(), permissions: ["tables:read","tables:manage"] },
];

function read(): Role[] { try { const raw = localStorage.getItem(LS); return raw ? JSON.parse(raw) : SAMPLE; } catch { return SAMPLE; } }
function write(v: Role[]) { try { localStorage.setItem(LS, JSON.stringify(v)); } catch {} }

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>(() => read());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(() => roles.find(r => r.id === selectedId) ?? null, [roles, selectedId]);

  const addRole = () => {
    const id = Math.random().toString(36).slice(2, 9);
    const r: Role = { id, name: "New Role", members: 0, description: "", updatedAt: new Date().toISOString(), permissions: [] };
    const next = [...roles, r]; setRoles(next); write(next); setSelectedId(id);
  };
  const removeRole = (id: string) => { const next = roles.filter(r => r.id !== id); setRoles(next); write(next); if (selectedId === id) setSelectedId(null); };
  const rename = (id: string, name: string) => { const next = roles.map(r => r.id === id ? { ...r, name, updatedAt: new Date().toISOString() } : r); setRoles(next); write(next); };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Shield className="h-5 w-5" /><h2 className="text-lg font-semibold">Roles & Permissions</h2></div>
        <Button onClick={addRole}>+ Create Role</Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: roles list */}
        <div className="lg:col-span-1 space-y-3">
          {roles.map(r => (
            <Card key={r.id} className={`cursor-pointer ${selectedId===r.id?"ring-1 ring-primary":''}`} onClick={() => setSelectedId(r.id)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.members} members • Updated {new Date(r.updatedAt).toLocaleDateString()}</div>
                    {r.description && <div className="text-xs mt-1">{r.description}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); const name = prompt("Rename role", r.name) ?? r.name; rename(r.id, name); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={(e) => { e.stopPropagation(); if (confirm("Delete role?")) removeRole(r.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Right: permissions details */}
        <div className="lg:col-span-2">
          {!selected ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Select a role to configure permissions</CardTitle>
                <CardDescription>Choose from the list to view and edit permissions</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{selected.name} — Permissions</CardTitle>
                <CardDescription>Toggle capabilities for this role</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {PERMS.map(p => (
                  <div key={p.key} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{p.label}</div>
                      <div className="text-xs text-muted-foreground">{p.desc}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={selected.permissions.includes(p.key)}
                      onChange={(e) => {
                        const next = roles.map(r => r.id === selected.id
                          ? { ...r, permissions: e.target.checked ? [...new Set([...r.permissions, p.key])] : r.permissions.filter(x => x !== p.key), updatedAt: new Date().toISOString() }
                          : r);
                        setRoles(next); write(next);
                      }}
                    />
                  </div>
                ))}
                <Separator />
                <div className="flex items-center gap-2">
                  <div className="text-xs text-muted-foreground">Role ID:</div>
                  <div className="text-xs font-mono">{selected.id}</div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

const PERMS = [
  { key: "orders:read", label: "View Orders", desc: "See all orders" },
  { key: "orders:write", label: "Modify Orders", desc: "Create and edit orders" },
  { key: "tables:read", label: "View Tables", desc: "View floor plan and statuses" },
  { key: "tables:manage", label: "Manage Tables", desc: "Seat, clear, and edit layout" },
  { key: "staff:manage", label: "Manage Staff", desc: "Invite, deactivate, and change roles" },
];
