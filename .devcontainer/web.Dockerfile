ARG IMAGE_NAME
FROM ${IMAGE_NAME}
# Based on https://code.visualstudio.com/remote/advancedcontainers/add-nonroot-user#_change-the-uidgid-of-an-existing-container-user
# This changes the www-data UID to 1000 to match the default user on the host, so that when it
# chowns everything to www-data, it doesn't make it so that the host user cannot write to the files
# anymore.
RUN groupmod --gid 1000 www-data \
    && usermod --uid 1000 --gid 1000 www-data \
    && chown -R 1000:1000 /opt/web2py/applications
# Move the original source code into a shared volume, clearing out anything from past runs.
RUN if [ -d /opt/web2py/applications/OZtree_original ]; then \
        rm -rf /opt/web2py/applications/OZtree_original; \
    fi \
    && mv /opt/web2py/applications/OZtree /opt/web2py/applications/OZtree_original
