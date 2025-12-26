# Stage 1: Build the Application
# We use node:22 as the base for building and installing dependencies.
FROM node:22 AS build

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker caching.
# If these files don't change, subsequent builds can skip 'npm install'.
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies including TypeScript
RUN npm install
RUN npm install --save-dev typescript @types/node

# Copy the rest of the application source code
COPY . .

# Build TypeScript (this compiles to /app/dist and copies templates)
RUN npm run build || npx tsc

# Copy data files to build stage data directory
RUN mkdir -p /app/data && cp -r src/data/* /app/data/

# Stage 2: Create the Final Production Image
# We use node:22-slim as a minimal runtime image.
FROM node:22-slim

# Set the working directory
WORKDIR /app

# Copy only production dependencies
COPY --from=build /app/package*.json ./
RUN npm install --only=production

# Copy the built application files from the 'build' stage
COPY --from=build /app/dist ./dist

# Copy static assets (frontend files)
COPY --from=build /app/app ./app

# Copy data directory from build stage
COPY --from=build /app/data ./data

# Create writable data directories with proper permissions
RUN mkdir -p /app/data/platforms /app/data/scenarios /app/data/session && \
    chown -R node:node /app/data

# Set environment variable to use /app/data
ENV DATA_DIR=/app/data
ENV PORT=3000
EXPOSE $PORT

# Run the application using the non-root user (recommended for security)
USER node

# Define the command to start your application
CMD [ "node", "dist/index.js" ]
