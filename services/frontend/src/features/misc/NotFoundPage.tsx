import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Compass, Home } from "lucide-react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function NotFoundPage() {
  useDocumentTitle("404 · Spoontab");
  return (
    <div className="min-h-screen bg-background">
      <header
        className="sticky top-0 z-40 border-b border-border"
        style={{
          background: "var(--header-bg)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3">
            <img src="/favicon.svg" alt="Spoontab" className="w-9 h-9 shrink-0" />
            <span className="text-lg font-semibold text-foreground">Spoontab</span>
          </Link>
          <Link to="/" className="tap-target flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            Back to site
          </Link>
        </div>
      </header>

      <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-2 mb-4">
          <Compass className="w-4 h-4 mr-2" />
          404
        </Badge>
        <h1 className="text-3xl sm:text-4xl text-foreground leading-tight mb-3">
          Off the Floor Plan
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed mb-8">
          There's no table here — the page you're looking for doesn't exist or has moved.
        </p>
        <Button asChild size="lg" className="shadow-md">
          <Link to="/">
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Link>
        </Button>
      </section>
    </div>
  );
}
