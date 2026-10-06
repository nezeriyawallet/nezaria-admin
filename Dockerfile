# Render currently cannot clone this repository (GitHub returns 403), so the
# same application is also published as a container image by GitHub Actions.
# Use Debian rather than Alpine for the runtime.  Vinext's Node production
# server can fail to initialise on musl/Alpine without producing a useful
# process log, which leaves Render waiting for a port that never opens.
FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
# The lockfile is maintained by the generated application scaffold and does
# not yet match every package metadata update. Use the same install mode that
# produced the previously published image, so the container build remains
# reproducible enough for this service and does not fail before startup.
RUN npm install

COPY . ./

# These are public, browser-facing Supabase settings. They are supplied by the
# GitHub Actions workflow as build arguments and are never committed to Git.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

# Render runs this image in Node.js. The Vite config uses this flag to replace
# the Cloudflare Workers-only runtime module with a safe Node environment shim.
ENV NEZERIYA_RENDER=true

RUN npm run build

ENV NODE_ENV=production
ENV PORT=10000
ENV HOST=0.0.0.0
EXPOSE 10000

# Invoke the server directly, rather than via npm's shell wrapper, so Render
# observes the listening Node process as soon as it starts.
CMD ["node", "scripts/vinext-render.mjs", "start"]
