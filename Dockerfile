# Builds the bundled Aurora example with the local veridocs source and
# serves it with nginx — a one-command demo of the whole pipeline:
#
#   docker build -t veridocs-demo .
#   docker run -p 8080:80 veridocs-demo
#
# For your own docs project, use the Dockerfile that `veridocs init`
# scaffolds (it installs veridocs from npm instead).

FROM node:22-alpine AS build
WORKDIR /veridocs
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY bin ./bin
COPY src ./src
COPY themes ./themes
COPY example ./example
RUN node bin/veridocs.js build --source example/source --theme example/theme --out build

FROM nginx:alpine
COPY --from=build /veridocs/build /usr/share/nginx/html
COPY example/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
