#!/bin/sh

# Ensure we have the necessary files
touch /data/log/cron.log
touch /etc/crontabs/docker_internal

echo "Scheduling snapshot-video with schedule: $CRON_SCHEDULE_VIDEO_SNAPSHOT"
sed -i '/npm run snapshot-video/d' /etc/crontabs/docker_internal
echo "$CRON_SCHEDULE_VIDEO_SNAPSHOT cd /app && npm run snapshot-video >> /data/log/video_snapshot.log 2>&1" >> /etc/crontabs/docker_internal

# Periodically convert videos to images so that they can be reviewed in between timelapses. Also distributes the work throughout the day. Depending on configuration this can also reduce storage space periodically
echo "Scheduling videos-to-images with schedule: $CRON_SCHEDULE_VIDEO_SNAPSHOT_TO_IMAGE"
sed -i '/npm run videos-to-images/d' /etc/crontabs/docker_internal
echo "$CRON_SCHEDULE_VIDEO_SNAPSHOT_TO_IMAGE cd /app && npm run videos-to-images >> /data/log/videos_to_images.log 2>&1" >> /etc/crontabs/docker_internal

# Note that we run videos-to-images before timelapse to ensure that all video snapshots are converted and available before creating the timelapse
echo "Scheduling timelapse with schedule: $CRON_SCHEDULE_TIMELAPSE"
sed -i '/npm run timelapse/d' /etc/crontabs/docker_internal
echo "$CRON_SCHEDULE_TIMELAPSE cd /app && npm run videos-to-images >> /data/log/videos_to_images.log 2>&1; cd /app && npm run timelapse >> /data/log/timelapse.log 2>&1" >> /etc/crontabs/docker_internal

