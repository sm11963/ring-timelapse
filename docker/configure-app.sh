#!/bin/sh

# Create necessary directories and files

mkdir -p /data/log
mkdir -p /data/content
mkdir -p /home/docker_internal
touch /app/.env

# Correct permissions for all directories

chown -R "$PUSER":"$PGROUP" /data
chmod -R 770 /data

chown -R "$PUSER":"$PGROUP" /app
chmod -R 770 /app

chown -R "$PUSER":"$PGROUP" /home/docker_internal
chmod -R 770 /home/docker_internal

# Set/update API_TOKEN in environment for application
sed -i '/^API_TOKEN/d' /app/.env
echo "API_TOKEN=\"$TOKEN\"" >> /app/.env
