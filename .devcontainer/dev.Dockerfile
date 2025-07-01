FROM mcr.microsoft.com/devcontainers/javascript-node:18
WORKDIR /opt
# Should align with https://github.com/OneZoom/OZtree-docker/blob/main/Dockerfile
RUN git clone --recursive https://github.com/web2py/web2py.git --depth 1 --branch v2.27.1 --single-branch web2py \
    && chown -R node:node web2py
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install mariadb-client
# Required to avoid build issue when running grunt
ENV NODE_OPTIONS=--openssl-legacy-provider=0
ENV PATH=${PATH}:/opt/web2py/applications/OZtree/node_modules/.bin
