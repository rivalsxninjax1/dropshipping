# Build stage
FROM node:20-alpine as build
WORKDIR /app
COPY package.json package-lock.json* /app/
RUN npm install
COPY . /app
RUN npm run build

# Serve via nginx
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

