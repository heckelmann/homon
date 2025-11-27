FROM --platform=$BUILDPLATFORM node:20-alpine AS deps
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

FROM --platform=$BUILDPLATFORM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set dummy database URL for build time
ENV DATABASE_URL="file:./homon.db"

RUN npx prisma generate
RUN --mount=type=cache,target=/app/.next/cache npm run build
RUN npx -y esbuild server.ts --bundle --platform=node --outfile=dist/server.js --external:next --external:ssh2 --external:socket.io --external:@prisma/client --external:bcryptjs --external:jose
RUN npx -y esbuild src/scheduler.ts --bundle --platform=node --outfile=dist/scheduler.js --external:@prisma/client --external:ssh2

FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY package.json package-lock.json ./
RUN npm ci --only=production && npm install prisma --no-save

COPY --from=builder /app/prisma ./prisma
RUN npx prisma generate

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone/.next ./.next
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/entrypoint.sh ./

RUN chmod +x entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
