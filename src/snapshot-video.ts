// Copyright (c) Wictor Wilén. All rights reserved.
// Licensed under the MIT license.

// Adds timestamps to all logs
require('log-timestamp')

import { writeFile, mkdirSync, existsSync, readFile } from 'fs';
import { RingApi } from 'ring-client-api'
import { promisify } from 'util';
import { delay } from './util';
import * as path from 'path'
import * as dotenv from "dotenv";
import * as lodash from "lodash";

const log = console.log;

async function snapshot_video() {
    log("running snapshot_video")
    const ringApi = new RingApi({
        refreshToken: process.env.API_TOKEN as string,
        debug: true,
        ffmpegPath: '/usr/bin/ffmpeg'
    });

    ringApi.onRefreshTokenUpdated.subscribe(
      async ({ newRefreshToken, oldRefreshToken }) => {
        console.log('Refresh Token Updated: ', newRefreshToken)

        if (!oldRefreshToken) {
          return
        }

        const currentConfig = await promisify(readFile)('.env'),
          updatedConfig = currentConfig
            .toString()
            .replace(oldRefreshToken, newRefreshToken)

        await promisify(writeFile)('.env', updatedConfig)
      }
    )

    log(`FFMPEG Path ${ringApi.options.ffmpegPath}`);
    const enabledCameraNames = (process.env.VIDEO_SNAPSHOT_CAMERAS as string ?? '').split(',');
    log(`Enabled cameras from env: ${enabledCameraNames}`);

    const cameras = await ringApi.getCameras();

    for (const {camera, index} of cameras.map((v, i) => ({camera: v, index: i}))) {
        const name = lodash.camelCase(camera.name);

        if (enabledCameraNames.filter(s => s.length > 0).length > 0 && !enabledCameraNames.includes(name)) {
          continue
        }

        if (index > 1) {
          console.log('Waiting 2s to improve video capture for sequential requests...')
          await delay(2000)
        }

        const snapshotPath = path.resolve(__dirname, 'target', 'video_snapshots', name);
        log(`Retrieving video snapshot for ${camera.name}`);

        try {
          log(snapshotPath);
          if (!existsSync(snapshotPath)) {
              mkdirSync(snapshotPath, { recursive: true });
          }
        } catch (err) {
          log(`Error: ${err}`);
        }

        const filename = Date.now() + '.mp4'
        const filepath = path.join(snapshotPath, filename);

        try {
          await camera.recordToFile(filepath, 2);
          log('Saved ' + filepath + '!');
        } catch (err) {
          log(`Video snapshot error: ${err}`);
        }
    }

    process.exit(0);

//    const camera = cameras[0];
//      const name = lodash.camelCase(camera.name);
//      log(`Retrieving video snapshot for ${camera.name}`);
//
//      try {
//        log((path.resolve(__dirname, "target", name)));
//        if (!existsSync(path.resolve(__dirname, "target", name))) {
//            mkdirSync(path.resolve(__dirname, "target", name));
//        }
//      } catch (err) {
//        log(`Error: ${err}`);
//      }
//
//      const filename = Date.now() + '.mp4';
//      const filepath = path.resolve(__dirname, "target", path.join(name, filename));
//      await camera.recordToFile(filepath, 15);
//      log('Saved ' + filepath + '!');
//    const promises = cameras.map(camera => {
//        const name = lodash.camelCase(camera.name);
//        log(`Retrieving video snapshot for ${camera.name}`);
//
//        try {
//          log((path.resolve(__dirname, "target", name)));
//          if (!existsSync(path.resolve(__dirname, "target", name))) {
//              mkdirSync(path.resolve(__dirname, "target", name));
//          }
//        } catch (err) {
//          log(`Error: ${err}`);
//        }
//
//        const filename = Date.now() + '.mp4'
//        const filepath = path.resolve(__dirname, "target", path.join(name, filename))
//        return camera.recordToFile(filepath, 15).then(function (result) {
//          log('Saved ' + filepath + '!');
//        }).catch(err => {
//          log(`Video snapshot error: ${err}`);
//        })
//    });
//
//    Promise.all(promises).finally(function () {
//      process.exit(0)
//    });
}

dotenv.config();

snapshot_video()
