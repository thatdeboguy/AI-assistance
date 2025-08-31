FROM node:20-alpine

# Set the working directory (matches compose volume mount)
WORKDIR /frontend

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install 

# Copy the rest of the application
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run the app, Using vite for development
CMD ["npm", "run", "dev"]