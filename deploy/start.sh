#!/bin/sh
# Container start. By default only the web server (Docker Compose runs the migration and the worker as their own services).
# With INGENIUM_SINGLE_CONTAINER=on (a Coolify "Dockerfile" resource, protected by Coolify's own HTTP basic auth, like Arche,
# Crucible and Clavis): apply the migrations (and the seed of an empty schema, INGENIUM_SEED) first, then run the worker in the
# background (backups, read of Keystone, declaration to Matrix), then the web server on port 4000.
set -e
if [ "${INGENIUM_SINGLE_CONTAINER:-}" = "on" ]; then
  npm run db:migrate
  npm run worker &
fi
exec node_modules/.bin/next start -H 0.0.0.0 -p 4000
