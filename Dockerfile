FROM mhart/alpine-node:9.2.0

RUN apk update && apk add --virtual build-dependencies git python g++ make

RUN mkdir -p /deploy/vault
ADD . /deploy/vault
WORKDIR /deploy/vault

RUN yarn
RUN yarn global add truffle
RUN truffle compile

RUN apk del build-dependencies

CMD while :; do sleep 2073600; done
