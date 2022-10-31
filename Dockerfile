FROM node:16 AS BUILD_IMAGE

# install node-prune
RUN curl -sf https://gobinaries.com/tj/node-prune | sh

WORKDIR /work

COPY . /work/

# install, build, remove dev deps, and prune
RUN npm install \
  && npm run build \
  && npm prune --production \
  && /usr/local/bin/node-prune

FROM node:16-alpine

# add ffmpeg
RUN apk update \
  && apk add ffmpeg

# UID to use to run the application processes. If this is not set, there will be issues with file access permissions.
# See this guide for example: https://drfrankenstein.co.uk/step-2-setting-up-a-restricted-docker-user-and-obtaining-ids/
ENV PUID=
# GID to use to run the application processes. If this is not set, there will be issues with file access permissions.
# See this guide for example: https://drfrankenstein.co.uk/step-2-setting-up-a-restricted-docker-user-and-obtaining-ids/
ENV PGID=
# Token used to authenticate with Ring API.
# See this guide for generating this token: https://github.com/dgreif/ring/wiki/Refresh-Tokens
ENV RING_API_TOKEN=
ENV OUTPUT_DIR="/data/content"
# Default is all discovered cameras (unset or empty string is treated as enable all)
ENV VIDEO_SNAPSHOT_CAMERAS=""
# Schedule for taking video based snapshots.
ENV CRON_SCHEDULE_VIDEO_SNAPSHOT="*/15 * * * *"
# Schedule for converting video based snapshots to images.
ENV CRON_SCHEDULE_VIDEO_SNAPSHOT_TO_IMAGE="45 * * * *"
# THERE IS A PROBLEM WITH SCHEDULING TIMELAPSE - WE SHOULD MAKE SURE ALL IMAGES ARE CONVERTED BEFORE EXECUTING>
# Default is midnight for PST
ENV CRON_SCHEDULE_TIMELAPSE="0 7 * * *"
# Timeout in seconds for each ffmpeg process to convert a video to an image.
ENV VIDEO_TO_IMAGE_FFMPEG_TIMEOUT="300"
# Timeout in seconds for each ffmpeg process to convert images to timelapse.
ENV TIMELAPSE_FFMPEG_TIMEOUT="1500"

WORKDIR /app

# copy from build image
COPY --from=BUILD_IMAGE /work/dist ./dist
COPY --from=BUILD_IMAGE /work/node_modules ./node_modules
COPY --from=BUILD_IMAGE /work/package.json .


# Setup configuration scripts
COPY ./docker/configure-app.sh /var/local/bin/configure-app.sh
RUN chmod +x /var/local/bin/configure-app.sh
COPY ./docker/configure-cron.sh /var/local/bin/configure-cron.sh
RUN chmod +x /var/local/bin/configure-cron.sh

# Setup our application run file
COPY ./docker/run.sh /var/local/bin/run-ring-timelapse.sh
RUN chmod +x /var/local/bin/run-ring-timelapse.sh

CMD ["/var/local/bin/run-ring-timelapse.sh"]
