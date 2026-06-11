# Veridocs — two-stage image: build the docs with Node, serve them with nginx.
#
#   docker build -t my-docs .
#   docker run -p 8080:80 my-docs
#
# The final image contains only nginx and your static files (~10 MB on top
# of nginx:alpine). No Node, no markdown, no build tooling.

FROM node:22-alpine AS build
WORKDIR /docs
COPY . .
RUN npm install veridocs && npx veridocs build

FROM nginx:alpine
COPY --from=build /docs/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
