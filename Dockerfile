FROM node:18-alpine

WORKDIR /app

# Install dependencies first for caching
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Only production dependencies (optional, but good practice)
# RUN npm ci --omit=dev

EXPOSE 5000

# Run the compiled JS from dist folder
CMD ["node", "dist/server.js"]
