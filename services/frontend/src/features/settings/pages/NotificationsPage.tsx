import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Bell, Mail, MessageSquare, AlertTriangle } from "lucide-react";

type NotifCfg = {
  orderUpdatesEmail: boolean;
  dailySummaryEmail: boolean;
  marketingEmail: boolean;
  lowStockSms: boolean;
};

const NOTIF_LS = "settings.notifications.v1";

function readNotif(): NotifCfg {
  try {
    const raw = localStorage.getItem(NOTIF_LS);
    return raw
      ? JSON.parse(raw)
      : { orderUpdatesEmail: true, dailySummaryEmail: true, marketingEmail: false, lowStockSms: true };
  } catch {
    return { orderUpdatesEmail: true, dailySummaryEmail: true, marketingEmail: false, lowStockSms: true };
  }
}

function writeNotif(cfg: NotifCfg) {
  try { localStorage.setItem(NOTIF_LS, JSON.stringify(cfg)); } catch {}
}

export default function NotificationsPage() {
  const [cfg, setCfg] = useState<NotifCfg>(() => readNotif());
  useEffect(() => { writeNotif(cfg); }, [cfg]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Notifications</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Email Notifications</CardTitle>
            <CardDescription>Choose which emails you want to receive</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Row
              icon={<Mail className="h-4 w-4" />}
              label="Order Updates"
              desc="Send receipts and updates to your inbox"
              checked={cfg.orderUpdatesEmail}
              onChange={(v) => setCfg({ ...cfg, orderUpdatesEmail: !!v })}
            />
            <Separator />
            <Row
              icon={<Bell className="h-4 w-4" />}
              label="Daily Summary"
              desc="Receive a daily sales summary"
              checked={cfg.dailySummaryEmail}
              onChange={(v) => setCfg({ ...cfg, dailySummaryEmail: !!v })}
            />
            <Separator />
            <Row
              icon={<Mail className="h-4 w-4" />}
              label="Marketing Emails"
              desc="Product updates and tips"
              checked={cfg.marketingEmail}
              onChange={(v) => setCfg({ ...cfg, marketingEmail: !!v })}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">SMS & Alerts</CardTitle>
            <CardDescription>Operational alerts and messages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Row
              icon={<MessageSquare className="h-4 w-4" />}
              label="Low Stock Alerts (SMS)"
              desc="Notify when inventory is running low"
              checked={cfg.lowStockSms}
              onChange={(v) => setCfg({ ...cfg, lowStockSms: !!v })}
            />
            <Separator />
            <div className="flex items-start gap-3 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              Carrier rates may apply for SMS.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ icon, label, desc, checked, onChange }: { icon: React.ReactNode; label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="font-medium text-sm flex items-center gap-2">{icon} {label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

