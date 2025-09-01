import { Link } from "react-router-dom";

export default function NotFound() {
    return (
        <div className="mx-auto max-w-xl">
            <div className="rounded-2xl border p-8">
                <h1 className="mb-2 text-2xl font-semibold">Page not found</h1>
                <Link to="/" className="text-blue-600 underline">Go home</Link>
            </div>
        </div>
    );
}
