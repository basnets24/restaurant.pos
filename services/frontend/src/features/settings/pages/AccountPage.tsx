import { useMemo, useState } from "react";
import { useAuth } from "@/api-authorization/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Building2, User, Phone } from "lucide-react";

type RestaurantProfile = {
  operatingHours: string;
  taxRatePct: number; // 8.25 → 8.25
  currencyCode: string; // USD ($)
};

const LS_KEY = "settings.restaurant.profile.v1";

function readProfile(): RestaurantProfile {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { operatingHours: "Mon–Sun: 11:00 AM – 10:00 PM", taxRatePct: 8.25, currencyCode: "USD ($)" };
    const p = JSON.parse(raw);
    return {
      operatingHours: p.operatingHours ?? "Mon–Sun: 11:00 AM – 10:00 PM",
      taxRatePct: Number(p.taxRatePct ?? 8.25),
      currencyCode: p.currencyCode ?? "USD ($)",
    };
  } catch {
    return { operatingHours: "Mon–Sun: 11:00 AM – 10:00 PM", taxRatePct: 8.25, currencyCode: "USD ($)" };
  }
}

function writeProfile(p: RestaurantProfile) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(p)); } catch {}
}

export default function AccountPage() {
  const { profile } = useAuth();
  const display = useMemo(() => {
    const restaurantName = (profile as any)?.restaurant_name || (profile as any)?.restaurantName || "Demo Restaurant";
    const ownerName = (profile as any)?.name || [ (profile as any)?.given_name, (profile as any)?.family_name ].filter(Boolean).join(" ") || "Demo User";
    const phone = (profile as any)?.phone_number || (profile as any)?.phone || "(555) 123-4567";
    return { restaurantName, ownerName, phone };
  }, [profile]);

  const [cfg, setCfg] = useState<RestaurantProfile>(() => readProfile());
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<RestaurantProfile>(cfg);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Restaurant Settings</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Restaurant Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Restaurant Information</CardTitle>
            <CardDescription>Basic information about your restaurant</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 grid place-items-center">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="font-medium">{display.restaurantName}</div>
                <div className="text-xs text-muted-foreground">Restaurant Name</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 grid place-items-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="font-medium">{display.ownerName}</div>
                <div className="text-xs text-muted-foreground">Owner/Manager</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 grid place-items-center">
                <Phone className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="font-medium">{display.phone}</div>
                <div className="text-xs text-muted-foreground">Phone Number</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">System Settings</CardTitle>
            <CardDescription>Configure your restaurant management system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Operating Hours</span>
              <span className="font-medium">{cfg.operatingHours}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax Rate</span>
              <span className="font-medium">{cfg.taxRatePct.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Currency</span>
              <span className="font-medium">{cfg.currencyCode}</span>
            </div>

            <div className="pt-2">
              <Button variant="secondary" className="w-full" onClick={() => { setDraft(cfg); setOpen(true); }}>
                Edit Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit System Settings</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <label className="text-xs">Operating Hours</label>
            <Input value={draft.operatingHours} onChange={(e) => setDraft({ ...draft, operatingHours: e.target.value })} />
            <label className="text-xs">Tax Rate (%)</label>
            <Input type="number" step="0.01" value={draft.taxRatePct} onChange={(e) => setDraft({ ...draft, taxRatePct: Number(e.target.value) })} />
            <label className="text-xs">Currency</label>
            <Input value={draft.currencyCode} onChange={(e) => setDraft({ ...draft, currencyCode: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => { setCfg(draft); writeProfile(draft); setOpen(false); }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
