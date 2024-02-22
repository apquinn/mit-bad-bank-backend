FROM alpine:3.18

ENV NODE_VERSION 20.11.1
WORKDIR /usr/src/bad-bank-backend
COPY package*.json ./
RUN console.log(node -v)
RUN npm install
COPY . .
EXPOSE 3001:3001
CMD [ "node", "index.mjs" ]