# Insiders Activity Compass — production Docker image.
#
# Coolify builds and runs this image. Same image is reused for the
# scheduled task that calls `npm run ingest` on a cron — different
# command, same code + dependencies.

FROM node:20-alpine

WORKDIR /app

# Install deps first so the layer is cached across code-only changes.
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# Copy the rest of the app and build the production bundle.
COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Default command is the web app. The Coolify scheduled task overrides
# this with `npm run ingest` to run the SEC EDGAR refresh.
CMD ["npm", "start"]
