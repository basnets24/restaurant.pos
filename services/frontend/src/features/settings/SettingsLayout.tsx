import { Suspense } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppHeader } from "@/components/AppHeader";
import { User, ShieldCheck, Bell, type LucideIcon } from "lucide-react";

type SettingsTab = "account" | "security" | "notifications";

const TAB_LIST: { value: SettingsTab; label: string; Icon: LucideIcon }[] = [
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

  const go = (to: string) => navigate(to);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Settings" subtitle="Account & preferences" />

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8 items-stretch md:items-start">
        <Tabs
          value={activeTab}
          onValueChange={(v) => go(`/settings/${v}`)}
          orientation="vertical"
          className="hidden md:block w-[232px] shrink-0 sticky top-24 gap-1"
        >
          <TabsList className="flex-col h-auto w-full bg-transparent p-0 gap-1 items-stretch">
            {TAB_LIST.map(({ value, label, Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="justify-start gap-3 px-3.5 py-3 text-base font-semibold rounded-[10px] text-muted-foreground bg-transparent shadow-none data-[state=active]:bg-brand-soft data-[state=active]:text-brand-strong data-[state=active]:shadow-none"
              >
                <Icon className="h-8 w-8 shrink-0" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Mobile: horizontal scroll nav */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => go(`/settings/${v}`)}
          className="md:hidden w-full"
        >
          <TabsList className="w-full h-auto rounded-2xl p-1.5 flex items-center gap-1.5 bg-muted/50 overflow-x-auto">
            {TAB_LIST.map(({ value, label, Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="flex items-center gap-2.5 px-5 py-2.5 text-base font-medium flex-none data-[state=active]:shadow-sm"
              >
                <Icon className="h-6 w-6 shrink-0" />
                <span className="hidden sm:inline">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Route content renders here */}
        <div className="flex-1 min-w-0">
          <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
            <Outlet />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
