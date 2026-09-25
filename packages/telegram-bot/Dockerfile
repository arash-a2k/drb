FROM node:22-alpine

WORKDIR /app

# Copy package manifests for layer caching
COPY package.json package-lock.json ./
COPY packages/telegram-bot/package.json ./packages/telegram-bot/

# Install only telegram-bot dependencies (no sharp or build tools needed)
RUN npm ci --workspace @drb/telegram-bot --omit=dev --legacy-peer-deps

# Copy bot source code
COPY packages/telegram-bot ./packages/telegram-bot

WORKDIR /app/packages/telegram-bot

RUN chown -R node:node /app

USER node

# Defaults to running in long-polling or webhook mode (configured by env)
CMD ["node", "--experimental-strip-types", "src/index.ts"]
