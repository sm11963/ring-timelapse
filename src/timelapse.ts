// Copyright (c) Wictor Wilén. All rights reserved.
// Licensed under the MIT license.

// Adds timestamps to all logs
require('log-timestamp')

import { mkdirSync, writeFileSync, rmSync, existsSync, readdirSync, lstatSync } from 'fs';
import * as path from 'path'
import FfmpegCommand from 'fluent-ffmpeg';
import parser from 'cron-parser';
import { getTimestampFilenames } from './util';

// TODO: Add timestamp to logs entries

async function timelapse() {
    const cameraImagesRootPath = path.resolve(__dirname, "target", "video_snapshot_images");
    const outputRootPath = path.resolve(__dirname, "target", "timelapses");

    if (!existsSync(cameraImagesRootPath)) {
      console.log("WARNING: No input images found at ", cameraImagesRootPath, " skiping creating timelapse")
      process.exit(1)
    }

    const cameraDirs = readdirSync(cameraImagesRootPath);

    const timelapseSchedule = process.env.CRON_SCHEDULE_TIMELAPSE
    if ( !timelapseSchedule ) {
      console.log("ERROR: Timelapse schedule is unavailable. Should be set in environment variable CRON_SCHEDULE_TIMELAPSE");
      process.exit(1)
    }
    // Note this assumes that the cron schedule has uniform intervals (ie. every tues or every day vs every saturday and sunday)
    const cronSchedule = parser.parseExpression(timelapseSchedule!)
    const timelapseInterval = Math.abs(cronSchedule.next().toDate().getTime() - cronSchedule.next().toDate().getTime())

    console.log("Timelapse cron schedule", timelapseSchedule, `indicates each timelapse should be ${timelapseInterval / 1000}s long`)

    for (const f of cameraDirs) {
        const cameraInputDir = path.join(cameraImagesRootPath, f);
        const cameraOutputDir = path.join(outputRootPath, f);

        if (lstatSync(cameraInputDir).isDirectory()) {
            console.log(`Processing images for camera: ${f}`);

            const images = getTimestampFilenames(cameraInputDir, 'jpg')
            if (images.length == 0) {
              console.log('WARNING: No input images found at ', cameraInputDir)
              continue
            }

            // - NOTE: Should update this to just use the interval between the last two cron schedule executions
            const latestImageTimestamp = Number(images.sort().pop())
            console.log(`Most recent image timestamp: ${latestImageTimestamp}`)

            const timelapseImages = images
              // readd last image
              .concat(String(latestImageTimestamp))
              .filter(f => {
                return Number(f) >= latestImageTimestamp - timelapseInterval
              })

            const outputFilePath = path.join(cameraOutputDir, latestImageTimestamp + '.mp4')

            if (!existsSync(cameraOutputDir)) {
                console.log(`Creating output directory: ${cameraOutputDir}`);
                mkdirSync(cameraOutputDir, { recursive: true });
            } else {
              if (existsSync(outputFilePath)) {
                console.log(`WARNING: timelapse already exists ${outputFilePath}. No new images since this timelapse.`)
                continue
              }
            }

            const template = timelapseImages
              .sort()
              .reduce((result, f): string => {
                return result + `file ${path.join(cameraInputDir, f + '.jpg')}\n`;
              }, '')

            // write the template file to disk
            const templateFilePath = path.join(cameraOutputDir, latestImageTimestamp + '.txt');
            writeFileSync(templateFilePath, template);

            console.log(`Creating timelapse with inputs from ${templateFilePath}...`);
            let command = FfmpegCommand()
              .on('error', (err) => {
                  console.log('An error occurred: ' + err.message);
              })
              .on('end', () => {
                console.log(`Saved timelapse at ${outputFilePath}`);
                console.log('Not removing snapshots since we are debugging');
              //    console.log('Merging finished, removing snapshot images!');
              //    for (const file of files) {
              //        rmSync(path.resolve(__dirname, "target", f, file));
              //    }
              //    rmSync(templateFilePath);
              //    console.log("Done!");
              })
              .fpsOutput(24)
              .addInput(templateFilePath)
              .inputOptions(["-f", "concat", "-safe", "0"])
              .videoCodec('libx265')
              .outputOptions(['-crf 28', '-tag:v hvc1'])
              .noAudio()
              .format("mp4")
              .save(outputFilePath);

              // Kill ffmpeg after timeout just in case
              const timeoutSeconds = Number(process.env.VIDEO_TO_IMAGE_FFMPEG_TIMEOUT ?? '1500')
              const timeoutId = setTimeout(function() {
                command.on('error', function() {
                  console.log('Ffmpeg has been killed after', timeoutSeconds, 'seconds');
                });

                command.kill('SIGKILL');
              }, timeoutSeconds * 1000);

              // Cancel the timeout if ffmpeg completes
              command
                .on('error', (err) => {
                    clearTimeout(timeoutId)
                })
                .on('end', () => {
                    clearTimeout(timeoutId)
                })
        }
    }

}

timelapse();

