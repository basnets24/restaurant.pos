import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Shield, KeyRound, Smartphone, Laptop } from "lucide-react";
import { toast } from "sonner";

type SecurityCfg = { twoFactorEnabled: boolean };
const SEC_LS = "settings.security.v1";

function readCfg(): SecurityCfg {
  try {
    const raw = localStorage.getItem(SEC_LS);
    return raw ? JSON.parse(raw) : { twoFactorEnabled: false };
  } catch { return { twoFactorEnabled: false }; }
}

function writeCfg(cfg: SecurityCfg) {
  try { localStorage.setItem(SEC_LS, JSON.stringify(cfg)); } catch {}
}

export default function SecurityPage() {
  const [cfg, setCfg] = useState<SecurityCfg>(() => readCfg());
  useEffect(() => { writeCfg(cfg); }, [cfg]);

  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const canSavePw = useMemo(() => pw.next.length >= 8 && pw.next === pw.confirm, [pw]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Security</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Account Security */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account Security</CardTitle>
            <CardDescription>Manage your password and sign-in protection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 grid place-items-center">
                  <KeyRound className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="font-medium">Password</div>
                  <div className="text-xs text-muted-foreground">Last changed recently</div>
                </div>
              </div>
              <Button variant="outline" onClick={() => setPwOpen(true)}>Update Password</Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 grid place-items-center">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="font-medium">Two‑Factor Authentication</div>
                  <div className="text-xs text-muted-foreground">Add extra security at sign-in</div>
                </div>
              </div>
              <Switch checked={!!cfg.twoFactorEnabled} onCheckedChange={(v) => setCfg({ twoFactorEnabled: !!v })} />
            </div>
          </CardContent>
        </Card>

        {/* Devices & Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Devices & Sessions</CardTitle>
            <CardDescription>Manage where you are signed in</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Laptop className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm">This Browser • Now</div>
              </div>
              <span className="text-xs text-muted-foreground">Active</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm">iPhone • 2 days ago</div>
              </div>
              <Button variant="outline" size="sm">Sign out</Button>
            </div>
            <div className="pt-2">
              <Button variant="secondary" className="w-full">Sign out other sessions</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Update Password Dialog */}
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Password</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-1">
            <label className="text-xs">Current Password</label>
            <Input size="lg" type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
            <label className="text-xs">New Password</label>
            <Input size="lg" type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
            <label className="text-xs">Confirm New Password</label>
            <Input size="lg" type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwOpen(false)}>Cancel</Button>
            <Button disabled={!canSavePw} onClick={() => { setPwOpen(false); setPw({ current: "", next: "", confirm: "" }); toast.success("Password updated"); }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
