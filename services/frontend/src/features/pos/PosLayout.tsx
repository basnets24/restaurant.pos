import { Outlet, NavLink } from "react-router-dom";

export default function PosLayout() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Point of Sale</h1>
      <nav className="mb-4 flex gap-4 text-sm">
        <NavLink to="tables" className={({ isActive }) => isActive ? "font-medium" : "text-muted-foreground"}>Tables</NavLink>
      </nav>
      <Outlet />
    </div>
  );
}

