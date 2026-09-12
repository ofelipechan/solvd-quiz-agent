# Runs the Fastify API from source via tsx (same as `pnpm --filter api dev`),
# avoiding a separate build step for TS workspace packages consumed as source.
FROM node:20-bookworm-slim

# build-essential + python3: required to compile bcrypt's native addon.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential python3 \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@10.10.0

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

COPY . .

WORKDIR /app/apps/api
EXPOSE 3001
CMD ["pnpm", "exec", "tsx", "src/server.ts"]
