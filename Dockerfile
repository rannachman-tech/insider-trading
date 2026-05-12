# Insider Signal — production Docker image.
#
# Coolify builds and runs this image. Same image is reused for the
# scheduled task that calls `npm run fetch` on a cron — different
# command, same code + dependencies.

FROM node:20-alpine

WORKDIR /app

# Install deps first so the layer is cached across code-only changes.
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# Copy the rest of the app and build the production bundle.
COPY . .
RUN npm run build

# Stash a copy of the snapshot at a path OUTSIDE the volume mount so the
# entrypoint can use it to seed an empty volume on first Coolify deploy.
# Without this, the empty persistent volume shadows the image's /app/data
# and the page renders empty for the first day until the cron seeds it.
RUN mkdir -p /app/defaults && \
    cp data/insider-snapshot.json /app/defaults/insider-snapshot.json

# Entrypoint handles the seed-if-empty step before handing off to the
# real command (npm start, or npm run fetch for the scheduled task).
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# Default command is the web app. The Coolify scheduled task overrides
# this with `npm run fetch` to run the SEC EDGAR refresh.
CMD ["npm", "start"]
