import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDinerAuth } from "../auth/DinerAuthProvider";

/**
 * Compact account control for the diner header - mirrors AppHeader's avatar dropdown, scoped
 * down to just the signed-in email and sign out, since a diner account has no settings surface.
 * Renders nothing when signed out (there's no session to show or clear).
 */
export function DinerAccountMenu() {
  const { session, signOut } = useDinerAuth();
  const navigate = useNavigate();
  if (!session) return null;

  const initial = (session.email?.trim()?.[0] ?? "D").toUpperCase();

  // Always back to discovery, not just wherever the diner happened to be - a page that needed
  // the session they just gave up (order history, an order's status) would otherwise sit there
  // showing a broken, signed-out-looking version of itself instead of taking them somewhere
  // that still works.
  const handleSignOut = () => {
    signOut();
    navigate("/order");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="w-9 h-9 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Account menu"
        >
          {initial}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuLabel className="truncate">{session.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-2" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
