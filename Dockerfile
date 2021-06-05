FROM node:stretch-slim

RUN apt-get update
RUN apt-get -y install wget
RUN wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
RUN apt-get -fy install ./google-chrome-stable_current_amd64.deb
ENV CHROME_PATH=/usr/bin/google-chrome

WORKDIR /usr/src/app
COPY package.json package-lock.json index.js ./
RUN npm install
CMD ["npm", "start"]
