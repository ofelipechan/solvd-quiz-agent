# Solvd Quiz Agent

Solvd Quiz Agent is a full-stack TypeScript application that turns a Markdown document into an interactive quiz. A user provides a public Markdown or GitHub URL, the API fetches its content, asks an LLM to generate 5–8 questions, stores the quiz in PostgreSQL, and scores the submitted answers.

## Features

- Generate quizzes from public Markdown and GitHub file URLs
- Single-answer and multiple-answer questions with four options each
- Weighted scoring: each question scores 0–4 (multiple-answer questions earn partial credit, with wrong picks cancelling correct ones); weights are split equally across questions and the final score is their weighted average
- Cookie-based authentication and quiz history
- PostgreSQL persistence through Drizzle ORM
- OpenRouter-powered structured quiz generation
- Optional Langfuse tracing with sensitive-data masking
- Unit, integration, end-to-end, and BDD parity checks

## Architecture

The repository is a pnpm workspace with two applications:

- `apps/web`: React 19, Vite, React Router, and Tailwind CSS
- `apps/api`: Fastify, PostgreSQL, Drizzle ORM, OpenRouter, and Langfuse

The web client calls the REST API. The API validates requests, fetches source Markdown, generates questions through OpenRouter, and persists quizzes, answers, submissions, and scores in PostgreSQL.

![Solvd Quiz Agent architecture](docs/architecture.jpeg)

## Prerequisites

- Node.js 20 or newer
- pnpm 10.10.0
- Docker with Docker Compose
- An [OpenRouter](https://openrouter.ai/) API key
- Optional: a Langfuse project for LLM observability

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create the local environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

   On macOS or Linux:

   ```bash
   cp .env.example .env
   ```

3. Edit `.env` and set at least:

   ```dotenv
   DATABASE_URL=postgres://postgres_local:postgres_local@localhost:5432/postgres_local
   JWT_SECRET=replace-with-a-long-random-secret
   OPENROUTER_API_KEY=your-openrouter-api-key
   ```

   Langfuse variables are optional. Leave placeholder values unset if tracing is not required. You can also override the default model with `OPENROUTER_LLM_MODEL`.

4. Start PostgreSQL:

   ```bash
   docker compose up -d postgres
   ```

5. Apply the existing database migrations and seed the local admin account:

   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

6. Start the API and web application:

   ```bash
   pnpm dev
   ```

7. Open [http://localhost:3000](http://localhost:3000) and sign in with:

   ```text
   Email: admin@solvd.com
   Password: solvdAdmin
   ```

   These credentials are intended for local development only.

The web app runs on port `3000`; the API runs on port `3001`.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Signs and verifies authentication cookies |
| `OPENROUTER_API_KEY` | Yes | Authenticates quiz-generation requests |
| `OPENROUTER_LLM_MODEL` | No | Overrides the default OpenRouter model |
| `WEB_ORIGIN` | No | Allowed web origin; defaults to `http://localhost:3000` |
| `VITE_API_URL` | No | Browser API base URL; defaults to `http://localhost:3001` |
| `LANGFUSE_PUBLIC_KEY` | No | Langfuse project public key |
| `LANGFUSE_SECRET_KEY` | No | Langfuse project secret key |
| `LANGFUSE_BASE_URL` | No | Langfuse cloud region or self-hosted URL |
| `LANGFUSE_TRACING_ENVIRONMENT` | No | Trace environment label |

## Useful commands

```bash
pnpm dev              # Start PostgreSQL, API, and web app
pnpm build            # Build all workspace applications
pnpm lint             # Lint all workspace applications
pnpm test             # Run unit tests
pnpm test:integration # Run integration tests
pnpm test:e2e         # Run Playwright end-to-end tests
pnpm bdd:check        # Check feature-file and test parity
pnpm db:migrate       # Apply existing database migrations
pnpm db:seed          # Seed the local admin user
```

## Project structure

```text
apps/
  api/                  Fastify API, services, repositories, and database
  web/                  React application
docs/                   Architecture and engineering documentation
specs/                  Gherkin feature specifications
docker-compose.yml      Local PostgreSQL and application services
```
