// Copyright (c) Sam Miller. All rights reserved.
// Licensed under the MIT license.

// Adds timestamps to all logs
require('log-timestamp')

import { writeFile, mkdirSync, existsSync, readFile } from 'fs';
import { RingApi } from 'ring-client-api'
import { promisify } from 'util';
import { delay, baseContentDirectory } from './util';
import * as path from 'path'
import * as dotenv from "dotenv";
import * as lodash from "lodash";

// TODO: Send email/notification when there is a failure (like token expired)
// TODO: See if we can remove ffmpeg path

async function snapshot_video() {
    console.log("running snapshot_video")
    const ringApi = new RingApi({
        refreshToken: process.env.API_TOKEN as string,
        debug: true
//       ffmpegPath: '/usr/bin/ffmpeg'
    });

    ringApi.onRefreshTokenUpdated.subscribe(
      async ({ newRefreshToken, oldRefreshToken }) => {
        if (!oldRefreshToken) {
          return
        }

        const currentConfig = await promisify(readFile)('.env'),
          updatedConfig = currentConfig
            .toString()
            .replace(oldRefreshToken, newRefreshToken)

        await promisify(writeFile)('.env', updatedConfig)

        console.log('Ring API refresh Token updated!')
      }
    )

    console.log(`FFMPEG Path ${ringApi.options.ffmpegPath}`);
    const enabledCameraNames = (process.env.VIDEO_SNAPSHOT_CAMERAS as string ?? '').split(',');
    console.log(`Enabled cameras from env: ${enabledCameraNames}`);

    const cameras = await ringApi.getCameras();

    console.log(`Found cameras from Ring: ${cameras.map(c => { lodash.camelCase(c.name) })}`)

    for (const {camera, index} of cameras.map((v, i) => ({camera: v, index: i}))) {
        const name = lodash.camelCase(camera.name);

        if (enabledCameraNames.filter(s => s.length > 0).length > 0 && !enabledCameraNames.includes(name)) {
          continue
        }

        if (index > 1) {
          console.log('Waiting 2s to improve video capture for sequential requests...')
          await delay(2000)
        }

        const snapshotPath = path.join(baseContentDirectory(), 'video_snapshots', name);
        console.log(`Retrieving video snapshot for ${camera.name}`);

        try {
          console.log(snapshotPath);
          if (!existsSync(snapshotPath)) {
              mkdirSync(snapshotPath, { recursive: true });
          }
        } catch (err) {
          console.log(`Error: ${err}`);
        }

        const filename = Date.now() + '.mp4'
        const filepath = path.join(snapshotPath, filename);

        try {
          await camera.recordToFile(filepath, 2);
          console.log('Saved ' + filepath + '!');
        } catch (err) {
          console.log(`Video snapshot error: ${err}`);
        }
    }
}

dotenv.config();

snapshot_video();
