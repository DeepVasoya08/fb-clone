FROM node:alpine
WORKDIR /server
COPY . /server/
EXPOSE 9000 6379
RUN npm install
CMD node server.js