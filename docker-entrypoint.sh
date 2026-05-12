#!/bin/sh
# Coolify first-deploy seed: if the persistent volume at /app/data is empty
# (no snapshot file yet), copy the one baked into the image at build time.
# This means the very first request after deploy still gets the 60-day
# history we committed in the repo — instead of an empty-state page until
# the cron runs.
#
# The cron's regular `npm run fetch` will overwrite this file with fresh
# data and ALSO carry the existing 60-day history forward, so the seed is
# strictly an initial-state fix, not an override.
set -e

if [ ! -f /app/data/insider-snapshot.json ] && [ -f /app/defaults/insider-snapshot.json ]; then
  echo "[entrypoint] Seeding empty volume with baked-in snapshot..."
  cp /app/defaults/insider-snapshot.json /app/data/insider-snapshot.json
fi

# Hand off to whatever command Coolify wanted to run (npm start for the
# web app, npm run fetch for the scheduled task).
exec "$@"
