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

ENV TOKEN=
ENV VIDEO_SNAPSHOT_CAMERAS=
ENV CRON_SCHEDULE_VIDEO_SNAPSHOT="*/15 * * * *"
ENV CRON_SCHEDULE_VIDEO_SNAPSHOT_TO_IMAGE="45 * * * *"
# THERE IS A PROBLEM WITH SCHEDULING TIMELAPSE - WE SHOULD MAKE SURE ALL IMAGES ARE CONVERTED BEFORE EXECUTING>
# Default is midnight for PST
ENV CRON_SCHEDULE_TIMELAPSE="0 7 * * *"
ENV VIDEO_TO_IMAGE_FFMPEG_TIMEOUT="300"
ENV TIMELAPSE_FFMPEG_TIMEOUT="1500"

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
