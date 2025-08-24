import { createBrowserRouter } from "react-router-dom";
import Home from "@/pages/Home";
import { Catalog } from "@/features/menu/pages/Catalog";
// import { AppShell } from "@/components/common/AppShell"; // optional for sub-pages

export const router = createBrowserRouter([
    { path: "/", element: <Home /> },
    // You can add more pages here; Home renders its own header.
    { path: "/catalog", element: <Catalog /> },
    // { path: "/orders", element: <Orders /> },
    // { path: "/tables", element: <Tables /> },
    // { path: "/admin", element: <Dashboard /> },
    // { path: "/login", element: <Login /> },
]);
