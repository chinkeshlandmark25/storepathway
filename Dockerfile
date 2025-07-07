# Use Node.js for serving static files and backend
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install

# Install frontend dependencies
WORKDIR /app/store
COPY store/package.json ./
RUN npm install

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/store/node_modules ./store/node_modules
COPY . .

# Build frontend
WORKDIR /app/store
RUN npm run build

WORKDIR /app
EXPOSE 8080

CMD ["node", "server.js"]
