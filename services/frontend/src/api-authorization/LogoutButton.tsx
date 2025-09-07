import React from "react";
import { useAuth } from "./AuthProvider";

type Props = {
  redirectTo?: string;
  className?: string;
  children?: React.ReactNode;
};

export default function LogoutButton({ redirectTo, className, children }: Props) {
  const { signOut } = useAuth();
  return (
    <button
      type="button"
      className={className ?? "btn"}
      onClick={() => { void signOut(redirectTo); }}
    >
      {children ?? "Sign out"}
    </button>
  );
}

