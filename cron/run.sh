#!/bin/sh

# TODO: Should write log files to output directory so that they can be accessed easily just like the outputs

sed -i '/npm run snapshot-video/d' /etc/crontabs/root
sed -i '/npm run videos-to-images/d' /etc/crontabs/root
sed -i '/npm run snapshot/d' /etc/crontabs/root
sed -i '/npm run timelapse/d' /etc/crontabs/root

echo "Scheduling snapshot-video with schedule: $CRON_SCHEDULE_VIDEO_SNAPSHOT"
echo "$CRON_SCHEDULE_VIDEO_SNAPSHOT cd /app && npm run snapshot-video >> /var/log/video_snapshot.log 2>&1" >> /etc/crontabs/root

echo "Scheduling videos-to-images with schedule: $CRON_SCHEDULE_VIDEO_SNAPSHOT_TO_IMAGE"
echo "$CRON_SCHEDULE_VIDEO_SNAPSHOT_TO_IMAGE cd /app && npm run videos-to-images >> /var/log/videos_to_images.log 2>&1" >> /etc/crontabs/root

echo "Scheduling timelapse with schedule: $CRON_SCHEDULE_TIMELAPSE"
echo "$CRON_SCHEDULE_TIMELAPSE cd /app && npm run timelapse >> /var/log/timelapse.log 2>&1" >> /etc/crontabs/root

sed -i '/^API_TOKEN/d' /app/.env

echo "API_TOKEN=\"$TOKEN\"" >> /app/.env

crond -L /var/log/cron.log && tail -f /var/log/cron.log
