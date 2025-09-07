import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/api-authorization/AuthProvider";
import { userManager } from "@/api-authorization/oidc";
import { ENV, getToken } from "@/config/env";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CircleUserRound, Building2, MapPin, Clock, KeySquare, PlusCircle, LogIn } from "lucide-react";
import { AuthorizationPaths } from "@/api-authorization/ApiAuthorizationConstants";

export default function JoinPage() {
  const { profile, getAccessToken, signOut } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const alreadyOnboarded = useMemo(() => !!((profile as any)?.restaurant_id ?? (profile as any)?.restaurantId), [profile]);

  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [name, setName] = useState("");
  const [locationName, setLocationName] = useState("");
  const [timeZoneId, setTimeZoneId] = useState<string | undefined>(undefined);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | undefined>();

  const displayName =
    (profile as any)?.name ||
    [ (profile as any)?.given_name, (profile as any)?.family_name ].filter(Boolean).join(" ") ||
    (profile as any)?.preferred_username ||
    (profile as any)?.email ||
    "User";
  const onLogout = () => void signOut(`${window.location.origin}${AuthorizationPaths.DefaultLoginRedirectPath}`);

  useEffect(() => {
    const prefill = params.get("code");
    if (prefill && !code) setCode(prefill);
  }, [params]);

  const authHeader = async () => {
    // Always try to refresh silently to pick up latest scopes/audience for Local API
    try { const u = await userManager.signinSilent(); if (u?.access_token) {
      return { "Content-Type": "application/json", Authorization: `Bearer ${u.access_token}` } as Record<string, string>;
    }} catch {}

    const token = await getAccessToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  };

  const afterSuccess = async () => {
    try { await userManager.signinSilent(); } catch {}
    navigate("/home", { replace: true });
  };

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);
    if (!name.trim()) { setError("Restaurant name is required"); return; }
    setCreating(true);
    try {
      const headers = await authHeader();
      const r = await fetch(`${ENV.IDENTITY_URL}/api/onboarding/restaurant`, {
        method: "POST",
        headers,
        body: JSON.stringify({ name, locationName: locationName || null, timeZoneId: timeZoneId || null }),
        credentials: "include",
      });
      if (!r.ok) throw new Error(await r.text());
      await afterSuccess();
    } catch (err: any) {
      setError(err?.message ?? "Failed to create restaurant");
    } finally { setCreating(false); }
  };

  const onJoin = async (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);
    if (!code.trim()) { setError("Join code is required"); return; }
    setJoining(true);
    try {
      const headers = await authHeader();
      const r = await fetch(`${ENV.IDENTITY_URL}/api/onboarding/join`, {
        method: "POST",
        headers,
        body: JSON.stringify({ code }),
        credentials: "include",
      });
      if (!r.ok) throw new Error(await r.text());
      await afterSuccess();
    } catch (err: any) {
      setError(err?.message ?? "Failed to join restaurant");
    } finally { setJoining(false); }
  };

  const NA_TIMEZONES: { id: string; label: string }[] = [
    { id: "America/St_Johns", label: "Newfoundland (UTC-03:30)" },
    { id: "America/Halifax", label: "Atlantic (UTC-04:00)" },
    { id: "America/New_York", label: "Eastern (UTC-05:00)" },
    { id: "America/Chicago", label: "Central (UTC-06:00)" },
    { id: "America/Denver", label: "Mountain (UTC-07:00)" },
    { id: "America/Phoenix", label: "Arizona (UTC-07:00, no DST)" },
    { id: "America/Los_Angeles", label: "Pacific (UTC-08:00)" },
    { id: "America/Anchorage", label: "Alaska (UTC-09:00)" },
    { id: "America/Adak", label: "Aleutian (UTC-10:00)" },
    { id: "Pacific/Honolulu", label: "Hawaii (UTC-10:00, no DST)" },
    { id: "America/Tijuana", label: "Baja California (UTC-08:00)" },
    { id: "America/Mazatlan", label: "Mazatlán (UTC-07:00)" },
    { id: "America/Mexico_City", label: "Mexico City (UTC-06:00)" },
    { id: "America/Monterrey", label: "Monterrey (UTC-06:00)" },
    { id: "America/Winnipeg", label: "Winnipeg (UTC-06:00)" },
    { id: "America/Regina", label: "Saskatchewan (UTC-06:00, no DST)" },
    { id: "America/Toronto", label: "Toronto (UTC-05:00)" },
    { id: "America/Montreal", label: "Montréal (UTC-05:00)" },
    { id: "America/Vancouver", label: "Vancouver (UTC-08:00)" },
  ];

  // Auto-detect browser time zone and preselect if it is in our list
  useEffect(() => {
    if (!timeZoneId) {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz && NA_TIMEZONES.some(t => t.id === tz)) {
          setTimeZoneId(tz);
        }
      } catch {
        // ignore detection errors
      }
    }
  }, [timeZoneId]);

  if (alreadyOnboarded) {
    // If a token refresh happened elsewhere, bounce to app
    navigate("/home", { replace: true });
    return null;
  }

  return (
    <div>
      {/* Minimal header with profile + logout */}
      <header className="bg-card border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="text-sm font-medium">Onboarding</div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <CircleUserRound className="h-4 w-4" />
                <span className="hidden sm:inline">{displayName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs">Signed in as</DropdownMenuLabel>
              <div className="px-2 pb-1 text-sm truncate">{displayName}</div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/settings/account")}>Profile</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <h1 className="text-2xl font-semibold">Get started</h1>
        <p className="text-muted-foreground mt-1">Create a new restaurant or join an existing one.</p>

        {error && (
          <div className="mt-4 p-3 rounded-md border border-red-300 text-red-700 bg-red-50">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10 mt-6">
          {/* Create Restaurant */}
          <Card className="h-full">
            <form onSubmit={onCreate} className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Create Restaurant</CardTitle>
                <CardDescription>You will become the Admin.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-1.5">
                  <Label className="text-base">Restaurant name</Label>
                  <Input size="lg" value={name} onChange={e => setName(e.target.value)} placeholder="Acme Bistro" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-base flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> Location name (optional)</Label>
                  <Input size="lg" value={locationName} onChange={e => setLocationName(e.target.value)} placeholder="Main" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-base flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> Time zone (optional)</Label>
                  <Select value={timeZoneId ?? ""} onValueChange={(v) => setTimeZoneId(v || undefined)}>
                    <SelectTrigger size="default" aria-label="Time zone">
                      <SelectValue placeholder="Select a time zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {NA_TIMEZONES.map(tz => (
                        <SelectItem key={tz.id} value={tz.id}>{tz.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter className="mt-auto">
                <Button size="lg" type="submit" disabled={creating} className="w-full">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  {creating ? "Creating…" : "Create"}
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Join with Code */}
          <Card className="h-full">
            <form onSubmit={onJoin} className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><KeySquare className="h-4 w-4" /> Join with Code</CardTitle>
                <CardDescription>Ask your Admin for the code (restaurant slug or id).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-1.5">
                  <Label className="text-base">Join code</Label>
                  <Input size="lg" value={code} onChange={e => setCode(e.target.value)} placeholder="acme-bistro" />
                </div>
              </CardContent>
              <CardFooter className="mt-auto">
                <Button size="lg" type="submit" disabled={joining} className="w-full">
                  <LogIn className="h-4 w-4 mr-2" />
                  {joining ? "Joining…" : "Join"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
