# Use standard Node.js for maximum compatibility
FROM node:20

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy all necessary files
COPY prisma ./prisma/
COPY src ./src/
COPY *.js ./

# Generate Prisma client if needed
RUN npx prisma generate || echo "Prisma generate failed, continuing..."

# Expose port
EXPOSE 10000

# Start server using npm start (respects package.json)
CMD ["npm", "start"]
