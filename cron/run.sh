#!/bin/sh

sed -i '/snapshot-video$/d' /etc/crontabs/root
sed -i '/snapshot$/d' /etc/crontabs/root
sed -i '/timelapse$/d' /etc/crontabs/root

echo "Scheduling snapshot-video with schedule: $CRON_SCHEDULE"
echo "$CRON_SCHEDULE cd /app && npm run snapshot-video > /var/log/video_snapshot.log 2>&1" >> /etc/crontabs/root

echo "API_TOKEN=\"$TOKEN\"" > /app/.env

#echo "Scheduling timelapse processing with schedule: $CRON_SCHEDULE_TIMELAPSE"
#echo "$CRON_SCHEDULE_TIMELAPSE cd /app && npm run timelapse" >> /etc/crontabs/root

crond -L /var/log/cron.log && tail -f /var/log/cron.log
