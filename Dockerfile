# syntax=docker/dockerfile:1.7

FROM node:22.18-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build && pnpm verify:private-content-bundle

FROM nginx:1.29.1-alpine AS runtime
COPY deploy/nginx.conf /etc/nginx/nginx.conf
COPY deploy/security-headers.conf /etc/nginx/security-headers.conf
COPY deploy/runtime-config.template.js /opt/mantuo/runtime-config.template.js
COPY deploy/version.template.json /opt/mantuo/version.template.json
COPY deploy/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh
COPY --from=build /app/dist /usr/share/nginx/html
RUN rm -f /etc/nginx/conf.d/default.conf \
  && chmod 0555 /docker-entrypoint.d/40-runtime-config.sh \
  && chmod -R a-w /usr/share/nginx/html /opt/mantuo
USER nginx
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O - http://127.0.0.1:8080/healthz >/dev/null || exit 1
