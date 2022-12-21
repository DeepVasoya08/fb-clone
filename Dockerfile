# FROM node:alpine
# WORKDIR /server
# COPY . /server/
# EXPOSE 9000 6379
# RUN npm install
# CMD node server.js

FROM alpine
RUN apk add --update nodejs npm redis
ENV PORT=8080
EXPOSE 6379 9000 8080
WORKDIR /server
COPY . /server/
RUN npm install
CMD redis-server & node server.js
