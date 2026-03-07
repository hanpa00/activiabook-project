import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center px-6 py-24 text-center space-y-8 bg-zinc-50 dark:bg-zinc-900/50">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
          ActiviaBook
        </h1>
        <p className="max-w-[600px] text-zinc-500 md:text-xl dark:text-zinc-400">
          Simple, personal, and private double-entry bookkeeping. Track your assets, liabilities, income, and expenses with complete control.
        </p>
        <div className="flex gap-4">
          <Link href="/dashboard">
            <Button size="lg">Go to Dashboard</Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg">Login</Button>
          </Link>
        </div>
      </section>

      {/* Features / About Section */}
      <section className="container px-6 py-16 mx-auto grid md:grid-cols-3 gap-8">
        <div className="flex flex-col space-y-2 p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
          <h3 className="text-xl font-bold">Double-Entry Core</h3>
          <p className="text-zinc-500 dark:text-zinc-400">
            Built on standard accounting principles. Every transaction has a debit and a credit, ensuring your books are always balanced.
          </p>
        </div>
        <div className="flex flex-col space-y-2 p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
          <h3 className="text-xl font-bold">Privacy First</h3>
          <p className="text-zinc-500 dark:text-zinc-400">
            Your data is isolated with Row Level Security. Run it locally via Docker for complete ownership of your financial data.
          </p>
        </div>
        <div className="flex flex-col space-y-2 p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
          <h3 className="text-xl font-bold">Real-time Ledger</h3>
          <p className="text-zinc-500 dark:text-zinc-400">
            Instant updates to your general ledger and trial balance. Filter by date, account, or status to gain financial clarity.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        © {new Date().getFullYear()} ActiviaBook. Open Source Personal Finance.
      </footer>
    </div>
  );
}
