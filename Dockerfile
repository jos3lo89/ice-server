# ============================================
# paso 1: builder 
# ============================================
FROM node:24.12.0-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

RUN npx prisma generate

COPY . .

RUN npm run build

RUN npx esbuild prisma/seed.ts --bundle --platform=node --format=cjs --outfile=prisma/seed.js --external:@prisma/client --external:@prisma/adapter-pg --external:dotenv

RUN npm prune --production

# ============================================
# paso 2: production
# ============================================
FROM node:24.12.0-alpine AS production

RUN apk add --no-cache openssl

WORKDIR /app

ENV APP_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 5000

ENTRYPOINT ["./docker-entrypoint.sh"]