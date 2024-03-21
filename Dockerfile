FROM node:20

WORKDIR /usr/src/bad-bank-backend
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 443:3001
CMD [ "node", "index.mjs" ]





