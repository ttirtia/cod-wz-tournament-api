
FROM docker.io/node:15.11-alpine3.13

LABEL maintainer="ttirtia"

USER node

RUN mkdir -p /home/node/app
WORKDIR /home/node/app

COPY --chown=node:node package.json .

RUN npm install

COPY --chown=node:node . .

CMD [ "node", "index.js" ]
