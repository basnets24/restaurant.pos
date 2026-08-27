import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDinerAuth } from "./DinerAuthProvider";

type Mode = "signIn" | "register";

/**
 * Inline sign-in, deliberately not a redirect to the hosted login page: the diner reaches this
 * mid-order with a cart in localStorage, and a full page navigation is exactly where that cart
 * gets lost or the intent forgotten.
 */
export function DinerAuthDialog({
  open,
  onOpenChange,
  onSignedIn,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignedIn?: () => void;
}) {
  const { signIn, register } = useDinerAuth();
  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signIn") await signIn(email, password);
      else await register(email, password, name || undefined);
      onOpenChange(false);
      onSignedIn?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const swap = () => {
    setMode(mode === "signIn" ? "register" : "signIn");
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{mode === "signIn" ? "Sign in to order" : "Create an account"}</DialogTitle>
          <DialogDescription>
            {mode === "signIn"
              ? "Your cart is saved — signing in won't lose it."
              : "You'll need an account so the restaurant can find your order."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-3">
          {mode === "register" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="diner-name">Name</Label>
              <Input
                id="diner-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                placeholder="Optional"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="diner-email">Email</Label>
            <Input
              id="diner-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="diner-password">Password</Label>
            <Input
              id="diner-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signIn" ? "current-password" : "new-password"}
            />
          </div>

          {error && (
            <p role="alert" className="text-[13px] text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" disabled={busy} className="mt-1">
            {busy ? "Please wait…" : mode === "signIn" ? "Sign in" : "Create account"}
          </Button>

          <button
            type="button"
            onClick={swap}
            className="text-[13px] text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            {mode === "signIn" ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
