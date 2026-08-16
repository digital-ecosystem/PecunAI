FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ pkg-config \
    libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
    openssl \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
ARG NEXT_PUBLIC_ENV
ARG NEXT_PUBLIC_FRONTEND_URL
ENV NEXT_PUBLIC_ENV=$NEXT_PUBLIC_ENV
ENV NEXT_PUBLIC_FRONTEND_URL=$NEXT_PUBLIC_FRONTEND_URL

# Next.js executes route modules at build time to collect page data. Some routes
# construct third-party SDK clients (OpenAI, etc.) at module load rather than
# inside the handler, so a placeholder value is required just to get past that
# static analysis step. This is BUILD-STAGE ONLY - it is never copied into the
# runner stage, and is overridden by the real secret from .env at container runtime.
ARG OPENAI_API_KEY=build-placeholder-not-a-real-key
ENV OPENAI_API_KEY=$OPENAI_API_KEY
ARG SIGND_WEBHOOK_SECRET=build-placeholder-not-a-real-key
ENV SIGND_WEBHOOK_SECRET=$SIGND_WEBHOOK_SECRET
ARG SIGNTEQ_API_KEY_PRO=build-placeholder-not-a-real-key
ENV SIGNTEQ_API_KEY_PRO=$SIGNTEQ_API_KEY_PRO
ARG JWT_SECRET=build-placeholder-not-a-real-key
ENV JWT_SECRET=$JWT_SECRET

RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl libcairo2 libpango-1.0-0 libjpeg62-turbo libgif7 librsvg2-2 \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY package.json ./
COPY server.ts tsconfig.json next.config.ts ./
COPY src ./src
EXPOSE 4001
CMD ["npm", "run", "start"]
