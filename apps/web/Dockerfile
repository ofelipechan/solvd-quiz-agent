# Builds and runs the Next.js app. NEXT_PUBLIC_API_URL is inlined at build
# time (Next.js requirement for NEXT_PUBLIC_* vars) and defaults to the API
# port published on the host, since the browser (not this container) calls it.
FROM node:20-bookworm-slim AS builder

RUN npm install -g pnpm@10.10.0
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

COPY . .

ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN pnpm --filter @quiz-agent/shared build --if-present
RUN pnpm --filter web build

WORKDIR /app/apps/web
EXPOSE 3000
CMD ["pnpm", "start"]
