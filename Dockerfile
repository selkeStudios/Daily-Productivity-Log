# Stage 1: Install dependencies
FROM node:20-alpine AS builder

WORKDIR /app

COPY src/package*.json ./

RUN npm ci

COPY src/ .

# Stage 2: Runtime
FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app ./

CMD ["node", "-e", "console.log('Gander Extension - Build environment ready. Version: ' + require('./package.json').version)"]