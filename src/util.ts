import { PathLike, readdirSync } from 'fs';

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

