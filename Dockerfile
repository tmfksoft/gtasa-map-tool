FROM node:14 as builder
WORKDIR /usr/src/app
COPY package.json ./
RUN npm install
COPY . ./
RUN npm run build

FROM nginx:1.12-alpine
RUN echo "server { listen 80; server_name localhost; location / { root /usr/share/nginx/html; try_files \$uri \$uri/ /index.html =404; } }" > /etc/nginx/conf.d/default.conf
COPY --from=builder /usr/src/app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]