# Render currently cannot clone this repository (GitHub returns 403), so the
# same application is also published as a container image by GitHub Actions.
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
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
EXPOSE 10000

CMD ["npm", "run", "start"]
