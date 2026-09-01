import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";
import { Button } from "@/components/ui/button";

/**
 * Catches render/loader errors that would otherwise crash to a blank white
 * screen (React's default with no boundary in the tree). Assigned as
 * `errorElement` on every top-level route in router.tsx.
 */
export default function RouteErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "An unexpected error occurred.";

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button asChild>
          <Link to="/">Go Home</Link>
        </Button>
      </div>
    </div>
  );
}
