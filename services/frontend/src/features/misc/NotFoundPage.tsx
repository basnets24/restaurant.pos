import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-2">404</h1>
      <p className="mb-4 text-muted-foreground">Page not found.</p>
      <Link to="/" className="underline">Go Home</Link>
    </div>
  );
}

