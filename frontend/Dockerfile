FROM node:24-alpine AS dependencies

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS build

WORKDIR /app
ARG API_ORIGIN=http://backend:8080
ARG NEXT_PUBLIC_PRODUCER_LOGIN=disabled
ARG NEXT_PUBLIC_PRODUCER_API=disabled
ENV API_ORIGIN=$API_ORIGIN
ENV NEXT_PUBLIC_PRODUCER_LOGIN=$NEXT_PUBLIC_PRODUCER_LOGIN
ENV NEXT_PUBLIC_PRODUCER_API=$NEXT_PUBLIC_PRODUCER_API

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
