import { Outlet, NavLink } from "react-router-dom";

export default function SettingsLayout() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Settings</h1>
      <nav className="mb-4 flex gap-4 text-sm">
        <NavLink to="account" className={({ isActive }) => isActive ? "font-medium" : "text-muted-foreground"}>Account</NavLink>
        <NavLink to="security" className={({ isActive }) => isActive ? "font-medium" : "text-muted-foreground"}>Security</NavLink>
        <NavLink to="notifications" className={({ isActive }) => isActive ? "font-medium" : "text-muted-foreground"}>Notifications</NavLink>
      </nav>
      <Outlet />
    </div>
  );
}
