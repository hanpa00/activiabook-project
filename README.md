# ActiviaBook

ActiviaBook is a simple yet powerful personal accounting application built with **Next.js 14**, **Supabase**, and **Docker**. It verifies strict accounting principles (Double Entry) and provides multi-tenancy for secure data isolation.

## Features

-   **Double-Entry Journal**: Ensures debits equal credits for every transaction.
-   **Multi-Tenancy**: Data is isolated by User ID via Row Level Security (RLS).
-   **Real-time Dashboard**: Track Account Balances, Net Income, and Cash Flow.
-   **Dockerized**: Fully self-contained environment (App + DB + Auth + Storage).

## Prerequisites

-   [Docker Desktop](https://www.docker.com/products/docker-desktop/) (must be running)
-   [Node.js 20+](https://nodejs.org/) (for local dev without Docker)

## Setup Guide (Docker) - Recommended

The easiest way to run ActiviaBook is with Docker Compose. This spins up the Next.js App, Supabase (Postgres, GoTrue, Realtime, Storage, Kong), and configures everything automatically.

### 1. Configure Environment

Copy the example environment file:
```bash
cp .env.example .env
```
*(If `.env.example` is missing, ensure your `.env` has `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, etc. pre-filled from the repository defaults)*.

### 2. Start the Stack

Run the following command to build and start all services:
```bash
docker compose up -d --build
```

### 3. Verify Installation

-   **App**: Visit [http://localhost:3000](http://localhost:3000)
-   **Supabase Studio**: Visit [http://localhost:54323](http://localhost:54323) (Database Dashboard)
-   **Mailpit**: Visit [http://localhost:54324](http://localhost:54324) (Email Inbox for Auth)

**Troubleshooting Docker:**
-   **Build Failures**: Ensure you have a `.env` file. The build process requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as build args.
-   **Realtime Crash**: If `supabase-realtime` exits with an IPv6 error, ensure `ERL_FLAGS="-proto_dist inet_tcp"` is set in `docker-compose.yml` (already patched in latest version).

## Setup Guide (Local Dev)

If you prefer running the Next.js app locally while keeping Supabase in Docker:

1.  **Start Database Only**:
    ```bash
    docker compose up -d supabase-db supabase-auth supabase-rest supabase-realtime supabase-storage supabase-meta supabase-kong supabase-studio
    ```
2.  **Install Dependencies**:
    ```bash
    npm install
    ```
3.  **Run Development Server**:
    ```bash
    npm run dev
    ```
    Access at `http://localhost:3000`.

## Project Structure

-   `app/`: Next.js App Router (Pages & API Routes).
-   `components/`: Reusable UI components (Shadcn/UI).
-   `utils/supabase/`: Supabase Client & Server utilities (Middleware, Auth).
-   `docker-compose.yml`: Definition of all services.
-   `supabase/migrations/`: Database schema and RLS policies.
