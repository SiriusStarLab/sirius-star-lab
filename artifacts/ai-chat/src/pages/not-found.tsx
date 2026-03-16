import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground">
      <div className="text-center space-y-6">
        <h1 className="text-8xl font-bold text-primary/20">404</h1>
        <h2 className="text-2xl font-semibold tracking-tight">Page not found</h2>
        <p className="text-muted-foreground max-w-sm mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="pt-4">
          <Link href="/">
            <Button size="lg" className="rounded-full px-8">
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
