// src/app/router.tsx
import {
    createBrowserRouter,
    RouterProvider,
} from "react-router-dom";
import { AuthorizationPaths} from "../api-authorization/ApiAuthorizationConstants.ts";
import {ProtectedRoute} from "../api-authorization/ProtectedRoute.tsx";

import LoginPage from "../api-authorization/LoginPage.tsx";
import LogoutPage from "../api-authorization/LogoutPage.tsx";
import LogoutCallbackPage from "../api-authorization/LogoutCallbackPage.tsx";
import LoginCallbackPage from "../api-authorization/LoginCallback.tsx";
import POSShell from "../shell/POSShell.tsx";
import LandingView from "../components/LandingView";
import HomeView from "../components/HomeView";
import ManagementView from "../components/ManagementView";

import TablesView from "../components/TableManagementView";



const user = { restaurantName: "Your Restaurant", firstName: "Alex", lastName: "Doe" };

const router = createBrowserRouter([
    
    
    // 1) Landing / marketing page
    { path: "/", element: <LandingView /> },

    // public + auth plumbing
    { path: AuthorizationPaths.Login, element: <LoginPage /> },
    { path: AuthorizationPaths.LoginCallback, element: <LoginCallbackPage /> },
    { path: AuthorizationPaths.LogOut, element: <LogoutPage /> },
    { path: AuthorizationPaths.LogOutCallback, element: <LogoutCallbackPage /> },

    // protected area


    {
        element: <ProtectedRoute/>,
        children: [
            { path: "/home", element: <HomeView /> },   // 2) Home selector (POS or Management)
            {
                path: "/pos", element : <POSShell userData={user} onBackToDashboard={function(): void {
                    throw new Error("Function not implemented.");
                } } />,
                children: [
                    // { path: "menu", element: <MenuView /> },
                    { path: "tables", element: <TablesView /> },
                    // { path: "checkout", element: <CheckoutView /> },
                ],
            },
            {  path: "/management", element: <ManagementView userData={user} >
                </ManagementView> },
        ],
    },
]);



export function AppRouter() {
    return <RouterProvider router={router} />;
}
