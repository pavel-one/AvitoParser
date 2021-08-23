FROM node:lts-alpine

# Install dependencies
RUN apk upgrade
RUN apk --update \
    add build-base \
    tzdata \
    gzip \
    chromium \
    chromium-chromedriver

RUN npm install -g nodemon