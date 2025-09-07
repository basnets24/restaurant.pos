import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { User, ShieldCheck, Bell } from "lucide-react";

type SettingsTab = "account" | "security" | "notifications";

const TAB_LIST: { value: SettingsTab; label: string; Icon: any }[] = [
  { value: "account",       label: "Account",       Icon: User },
  { value: "security",      label: "Security",      Icon: ShieldCheck },
  { value: "notifications", label: "Notifications", Icon: Bell },
];

export default function SettingsLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const active = (pathname.split("/")[2] as SettingsTab) ?? "account";
  const isValid = TAB_LIST.some(t => t.value === active);
  const activeTab = isValid ? active : "account";

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Card className="border-none shadow-none">
            <CardHeader className="py-2">
              <CardTitle className="text-lg">Settings</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={(v) => navigate(`/settings/${v}`)} className="space-y-6">
          <TabsList className="grid grid-cols-3 gap-2 rounded-2xl p-2">
            {TAB_LIST.map(({ value, label, Icon }) => (
              <TabsTrigger key={value} value={value} className="flex items-center gap-2">
                <Icon className="h-4 w-4" /> {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <Outlet />
        </Tabs>
      </main>
    </div>
  );
}
