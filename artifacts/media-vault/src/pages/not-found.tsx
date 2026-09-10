import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
      <h1 className="text-4xl font-bold mb-4 tracking-tight">404 - Not Found</h1>
      <p className="text-muted-foreground mb-8">The page you're looking for doesn't exist.</p>
      <Link href="/" className="px-5 py-2.5 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors shadow-sm">
        Return Home
      </Link>
    </div>
  );
}
