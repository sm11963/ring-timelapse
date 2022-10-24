FROM node:16 AS BUILD_IMAGE

# install node-prune
#RUN curl -sfL https://install.goreleaser.com/github.com/tj/node-prune.sh | bash -s -- -b /usr/local/bin

RUN curl -sf https://gobinaries.com/tj/node-prune | sh


WORKDIR /work

COPY . /work/

# install
RUN npm install

# build
RUN npm run build

# remove development dependencies
RUN npm prune --production

# run node prune
RUN /usr/local/bin/node-prune

FROM node:16-alpine

# add ffmpeg
RUN apk update
RUN apk add
RUN apk add ffmpeg

ENV TOKEN=$TOKEN
ENV VIDEO_SNAPSHOT_CAMERAS=$VIDEO_SNAPSHOT_CAMERAS
ENV CRON_SCHEDULE_VIDEO_SNAPSHOT=$CRON_SCHEDULE_VIDEO_SNAPSHOT
ENV CRON_SCHEDULE_VIDEO_SNAPSHOT_TO_IMAGE=$CRON_SCHEDULE_VIDEO_SNAPSHOT_TO_IMAGE
ENV CRON_SCHEDULE_TIMELAPSE=$CRON_SCHEDULE_TIMELAPSE
ENV VIDEO_TO_IMAGE_FFMPEG_TIMEOUT=$VIDEO_TO_IMAGE_FFMPEG_TIMEOUT
ENV TIMELAPSE_FFMPEG_TIMEOUT=$TIMELAPSE_FFMPEG_TIMEOUT

WORKDIR /app

# copy from build image
COPY --from=BUILD_IMAGE /work/dist ./dist
COPY --from=BUILD_IMAGE /work/node_modules ./node_modules
COPY --from=BUILD_IMAGE /work/package.json .

# Create the cron log
RUN touch /var/log/cron.log

# Setup our start file
COPY ./cron/run.sh /tmp/run.sh
RUN chmod +x /tmp/run.sh

CMD ["/tmp/run.sh"]
