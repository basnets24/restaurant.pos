import { Outlet } from "react-router-dom";

// Layout route for /pos/table/:tableId. Children (menu, order, checkout) own
// their own layout; navigation back to the floor is available from the POS nav.
export default function TableRoute() {
  return <Outlet />;
}
