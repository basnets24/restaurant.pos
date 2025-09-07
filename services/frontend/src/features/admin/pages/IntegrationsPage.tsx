import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Printer, Webhook, KeyRound } from "lucide-react";

type Integration = { key: string; name: string; desc: string; status: "Connected" | "Not Connected" | "Partial"; Icon: any };

const INTEGRATIONS: Integration[] = [
  { key: "payments", name: "Payment Processor", desc: "Connect Stripe/Square for card payments", status: "Connected", Icon: CreditCard },
  { key: "printers", name: "Kitchen Printers", desc: "Configure printers for KDS or tickets", status: "Partial", Icon: Printer },
  { key: "webhooks", name: "Webhooks", desc: "Receive events for orders and updates", status: "Not Connected", Icon: Webhook },
  { key: "api", name: "API Keys", desc: "Programmatic access to your data", status: "Not Connected", Icon: KeyRound },
];

export default function IntegrationsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Integrations</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {INTEGRATIONS.map(({ key, name, desc, status, Icon }) => (
          <Card key={key}>
            <CardHeader className="py-3 flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Icon className="h-4 w-4" /> {name}</CardTitle>
              <Badge variant={status === "Connected" ? "secondary" : status === "Partial" ? "outline" : "outline"}>{status}</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <CardDescription>{desc}</CardDescription>
              <div className="flex items-center gap-2 pt-1">
                <Button size="sm">Configure</Button>
                <Button size="sm" variant="outline">Help</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
