import { createBrowserRouter } from "react-router-dom";
import Shell from "./Shell";
import Home from "../routes/Home";
import Cart from "../routes/Cart";
import CheckoutSuccess from "../routes/CheckoutSuccess";
import CheckoutCancel from "../routes/CheckoutCancel";
import NotFound from "../routes/NotFound";
import Orders from "../routes/Orders";
import Tables from "../routes/Tables";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <Shell />,
        children: [
            { index: true, element: <Home /> },
            { path: "cart", element: <Cart /> },
            { path: "orders", element: <Orders /> },
            { path: "tables", element: <Tables /> },
            { path: "checkout/success", element: <CheckoutSuccess /> },
            { path: "checkout/cancel", element: <CheckoutCancel /> },
            { path: "*", element: <NotFound /> },
        ],
    },
]);
