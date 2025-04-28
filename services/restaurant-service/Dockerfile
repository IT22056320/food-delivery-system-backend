FROM node:23.11.0-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5001

CMD ["node", "server.js"]