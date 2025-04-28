# Use Node.js base image
FROM node:18

# Set working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first (for caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the service port
EXPOSE 5001

# Define environment variables (or use Docker Compose)
ENV NODE_ENV=production

# Start the app
CMD ["node", "app.js"]
