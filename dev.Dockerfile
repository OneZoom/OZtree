FROM mcr.microsoft.com/devcontainers/javascript-node:18
WORKDIR /opt
# Should align with https://github.com/OneZoom/OZtree-docker/blob/main/Dockerfile
RUN git clone --recursive https://github.com/web2py/web2py.git --depth 1 --branch v2.27.1 --single-branch web2py \
    && chown -R node:node web2py
COPY --chown=node:node _COPY_CONTENTS_TO_WEB2PY_DIR/routes.py web2py/
# Required to avoid build issue when running grunt
ENV NODE_OPTIONS=--openssl-legacy-provider=0
ENV PATH=${PATH}:/opt/web2py/applications/OZtree/node_modules/.bin
