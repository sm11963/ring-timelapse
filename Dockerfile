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
ENV CRON_SCHEDULE=$CRON_SCHEDULE
ENV CRON_SCHEDULE_TIMELAPSE="0 7 * * *"

WORKDIR /app

# copy from build image
COPY --from=BUILD_IMAGE /work/dist ./dist
COPY --from=BUILD_IMAGE /work/node_modules ./node_modules
COPY --from=BUILD_IMAGE /work/package.json .

# MOVED TO SCRIPT
# Setup the cron job to
#RUN echo "$CRON_SCHEDULE cd /app && npm run snapshot-video" >> /etc/crontabs/root
#RUN echo "$CRON_SCHEDULE_TIMELAPSE cd /app && npm run timelapse" >> /etc/crontabs/root

# Create the cron log
RUN touch /var/log/cron.log

# Setup our start file
COPY ./cron/run.sh /tmp/run.sh
RUN chmod +x /tmp/run.sh

CMD ["/tmp/run.sh"]
