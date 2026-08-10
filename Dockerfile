FROM denoland/deno:2.6.7 AS build

WORKDIR /app

COPY deno.json deno.lock ./
COPY vite.config.ts tsconfig.json postcss.config.mjs index.html main.tsx ./
COPY app ./app
COPY components ./components
COPY hooks ./hooks
COPY lib ./lib
COPY src ./src

RUN deno task build

FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
