FROM node:20-alpine AS builder

ARG REACT_APP_BACKEND_URL=http://localhost:8080

ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL \
    NODE_OPTIONS=--openssl-legacy-provider

WORKDIR /app

COPY package*.json ./
RUN npm install --force

COPY . .
RUN npm run build

# ─── Production: serve with nginx ───
FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
