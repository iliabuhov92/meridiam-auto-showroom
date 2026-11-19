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
