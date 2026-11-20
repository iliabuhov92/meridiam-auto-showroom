import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';

const project = new URL('./', import.meta.url);
const destination = new URL('public/bmw_m3_g80_meridiam.glb', project);
const expectedHash = '7229ea2876f2497f779574e3e094c4ad97b94eaad941cbca6975411560e68ea9';
const chunks = await Promise.all(
  [0, 1, 2].map(index => readFile(new URL('bmw_m3_g80.glb.part' + index, project)))
);
const model = Buffer.concat(chunks);
const hash = createHash('sha256').update(model).digest('hex');
if (hash !== expectedHash || model.readUInt32LE(8) !== model.length) {
  throw new Error('The BMW GLB asset is incomplete or has changed.');
}
await mkdir(new URL('public/', project), { recursive: true });
const temporary = new URL(destination.href + '.' + process.pid + '.tmp');
await writeFile(temporary, model);
await rename(temporary, destination);

// Small independently retriable downloads for the public showroom.
const packed = gzipSync(model, { level: 6 });
const partSize = 2 * 1024 * 1024;
const assetPrefix = 'public/bmw-' + hash.slice(0, 12);
const lengths = [];
for (let offset = 0; offset < packed.length; offset += partSize) {
  const part = packed.subarray(offset, offset + partSize);
  await writeFile(new URL(assetPrefix + '-' + lengths.length + '.bin', project), part);
  lengths.push(part.length);
}
await writeFile(new URL(assetPrefix + '.json', project), JSON.stringify({ lengths }));
console.log(`BMW download: ${packed.length} bytes in ${lengths.length} parts`);
