# Build do SPA (Vite). Node 22 LTS — mesma major usada no desenvolvimento.
FROM node:22.23.3-alpine AS builder
WORKDIR /app
COPY package*.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime: nginx SEM root (usuário 101), escutando em 8080 dentro do container.
# Versão fixada (reprodutibilidade — evita drift de :alpine/:latest).
FROM nginxinc/nginx-unprivileged:1.30.5-alpine
# Arquivos estáticos ficam com dono root (somente leitura para o nginx).
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
