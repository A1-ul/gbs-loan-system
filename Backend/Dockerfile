FROM node:18-alpine AS base

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/

FROM base AS dependencies
RUN npm ci --only=production

FROM base AS dev-dependencies
RUN npm ci

FROM dev-dependencies AS build
COPY . .
RUN npx prisma generate

FROM node:18-alpine AS production

WORKDIR /app

RUN apk add --no-cache openssl dumb-init

ENV NODE_ENV=production

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/prisma ./prisma
COPY src ./src
COPY package.json ecosystem.config.js ./

RUN mkdir -p logs uploads backups

EXPOSE 5000 9090

USER node

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
