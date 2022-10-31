// Copyright (c) Sam Miller. All rights reserved.
// Licensed under the MIT license.

// Adds timestamps to all logs
require('log-timestamp')

import * as dotenv from 'dotenv';
import * as path from 'path'
import { PathLike, readdirSync } from 'fs';

dotenv.config();

/* Returns base directory for all content.
 *
 * Note - uses configuration from OUTPUT_DIR environment variable or default if not provided.
 */
export function baseContentDirectory(): string {
  const envPath = process.env.OUTPUT_DIR?.trim() ?? ''
  const defaultPath = '/data/content'
  const dirPath = (envPath.length > 0) ? envPath : defaultPath
  return path.resolve(dirPath);
}

/* Return all file names from the given path that have numeric characters only and match the given extension.
 *
 * Note - extension is not returned as part of the file name.
 */
export function getTimestampFilenames(path:PathLike, extension:string): string[] {
  const files = readdirSync(path);
  const regexp = new RegExp(`^([0-9]+)\.${extension}$`)
  return files
    .filter(f => {
      return regexp.test(f);
    })
    .map(f => {
      const values = regexp.exec(f)
      return values![1]
    })
}

export function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

