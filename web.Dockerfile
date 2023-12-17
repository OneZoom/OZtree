ARG IMAGE_NAME
FROM ${IMAGE_NAME}
# Based on https://code.visualstudio.com/remote/advancedcontainers/add-nonroot-user#_change-the-uidgid-of-an-existing-container-user
# Without this, it will chown everything to www-data on the host and break permissions.
RUN groupmod --gid 1000 www-data \
    && usermod --uid 1000 --gid 1000 www-data \
    && chown -R 1000:1000 /opt/web2py/applications
RUN mv /opt/web2py/applications/OZtree /opt/web2py/applications/OZtree_original
