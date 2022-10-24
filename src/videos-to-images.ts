// Copyright (c) Sam Miller. All rights reserved.
// Licensed under the MIT license.

// Adds timestamps to all logs
require('log-timestamp')

import { PathLike, writeFileSync, rmSync, mkdirSync, existsSync, readdirSync, lstatSync } from 'fs';
import * as path from 'path'
import FfmpegCommand from 'fluent-ffmpeg';
import { getTimestampFilenames } from './util';

// TODO: Implement cleaning up processed videos (deleting them)
// TODO: Implement moving errored files to specific directory
// TODO: Use new output directory path (and take from parameter
// TODO: Add timestamp to all logs

async function videosToImages() {
    const foldersPath = path.resolve(__dirname, "target", "video_snapshots");
    const outputDir = path.resolve(__dirname, "target", "video_snapshot_images");
    const folders = readdirSync(foldersPath);

    folders.forEach(f => {
        const cameraPath = path.join(foldersPath, f);
        const cameraOutputDir = path.join(outputDir, f);
        if (lstatSync(cameraPath).isDirectory()) {
            console.log(`Processing video snapshots for camera: ${f}`);

            var latestImageTimestamp = 0
            if (!existsSync(cameraOutputDir)) {
                console.log(`Creating output directory: ${cameraOutputDir}`);
                mkdirSync(cameraOutputDir, { recursive: true });
            } else {
                const existingImages = getTimestampFilenames(cameraOutputDir, 'jpg')
                if (existingImages.length > 0) {
                  latestImageTimestamp = Number(existingImages.sort().pop())
                  console.log(`latest image timestamp: ${latestImageTimestamp}`)
                }
            }

            const processed_files = getTimestampFilenames(cameraPath, 'mp4')
            const new_files = processed_files.filter(f => {
              return Number(f) > latestImageTimestamp
            })

            console.log(`${processed_files.length} total input files. Processing ${new_files.length} new files...`)

            // Reverse to plan on process from oldest to newest via popping off the end
            var to_process = new_files.reverse()

            const processNext = () => {
              if (to_process.length > 0) {
                const f = to_process.pop()
                console.log(`Processing ${f+'.mp4'}...`)

                const outputFilePath = path.join(cameraOutputDir, f + '.jpg')

                let command = FfmpegCommand()
                  .on('error', (err) => {
                    console.log('An error occurred: ' + err.message);
                    processNext()
                  })
                  .on('end', () => {
                    console.log(`Wrote ${outputFilePath}`)
                    processNext()
                  })
                  .input(path.join(cameraPath, f + '.mp4'))
                  .seekInput('00:00:01')
                  .frames(1)
                  .outputOptions(['-q:v 5'])
                  .save(outputFilePath)

                // TODO: Add timestamp to images
                /*
                 * ffmpeg -ss 00:00:01 -i /Users/smiller/Desktop/docker_writable/video_snapshots/backyard/1666419965853.mp4 -vf drawtext="fontsize=32:fontcolor=white:text='2022-10-23 12\:04':x=20:y=(H-th-20)" -frames:v 1 output.png
                 *
                 * WITH BORDERS
                 * ffmpeg -ss 00:00:01 -i /Users/smiller/Desktop/docker_writable/video_snapshots/backyard/1666419965853.mp4 -vf drawtext="fontsize=32:fontcolor=white:text='2022-10-23 12\:04':x=20:y=(H-th-20):bordercolor=#000000@0.2:borderw=2" -frames:v 1 output.png
                 */

                // Kill ffmpeg after timeout just in case
                const timeoutSeconds = Number(process.env.VIDEO_TO_IMAGE_FFMPEG_TIMEOUT ?? '300')
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

            // Only run a given number of ffmpeg commands at once
            // subsequent commands will proceed as each finishes
            const numParallelProcesses = 20
            for (var i = 0; i < numParallelProcesses; i++) {
              processNext()
            }
        }
    });
}

videosToImages();

