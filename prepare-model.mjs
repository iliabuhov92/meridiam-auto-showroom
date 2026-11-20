import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';

const project = new URL('./', import.meta.url);
const destination = new URL('public/bmw_m3_g80_meridiam.glb', project);
const expectedHash = '7229ea2876f2497f779574e3e094c4ad97b94eaad941cbca6975411560e68ea9';
const chunks = await Promise.all(
  [0, 1, 2].map(index => readFile(new URL('bmw_m3_g80.glb.part' + index, project)))
);
const source = Buffer.concat(chunks);
const hash = createHash('sha256').update(source).digest('hex');
if (hash !== expectedHash || source.readUInt32LE(8) !== source.length) {
  throw new Error('The BMW GLB asset is incomplete or has changed.');
}
// The export repeats UV and other streams across thousands of accessors.
// Share identical bytes while preserving node names, geometry and textures.
function deduplicateGeometry(glb) {
  const jsonLength = glb.readUInt32LE(12);
  const spec = JSON.parse(glb.subarray(20, 20 + jsonLength));
  // Material texture references select UV sets. The original export includes
  // up to six channels per mesh even though its materials use only UV0.
  const textureChannels = new Set([0]);
  function findTextureChannels(value) {
    if (!value || typeof value !== 'object') return;
    if (Number.isInteger(value.texCoord)) textureChannels.add(value.texCoord);
    for (const child of Object.values(value)) findTextureChannels(child);
  }
  findTextureChannels(spec.materials);
  const primitives = spec.meshes.flatMap(mesh => mesh.primitives);
  const used = new Set();
  for (const primitive of primitives) {
    for (const name of Object.keys(primitive.attributes)) {
      const uv = /^TEXCOORD_(\d+)$/.exec(name);
      if (uv && !textureChannels.has(Number(uv[1]))) {
        delete primitive.attributes[name];
      }
    }
    for (const index of Object.values(primitive.attributes)) used.add(index);
    if (primitive.indices !== undefined) used.add(primitive.indices);
    for (const target of primitive.targets ?? []) {
      for (const index of Object.values(target)) used.add(index);
    }
  }
  if (spec.animations?.length || spec.skins?.length) throw new Error('Unexpected animated BMW source layout.');
  const accessorIndex = new Map();
  spec.accessors = spec.accessors.filter((_, index) => {
    if (!used.has(index)) return false;
    accessorIndex.set(index, accessorIndex.size);
    return true;
  });
  for (const primitive of primitives) {
    const attributeSets = [primitive.attributes, ...(primitive.targets ?? [])];
    for (const attributes of attributeSets) {
      for (const key of Object.keys(attributes)) attributes[key] = accessorIndex.get(attributes[key]);
    }
    if (primitive.indices !== undefined) primitive.indices = accessorIndex.get(primitive.indices);
  }
  const binary = glb.subarray(28 + jsonLength);
  const binaryParts = [];
  let length = 0;

  function append(bytes) {
    const padding = (4 - length % 4) % 4;
    if (padding) binaryParts.push(Buffer.alloc(padding));
    const offset = length + padding;
    binaryParts.push(bytes);
    length = offset + bytes.length;
    return offset;
  }

  for (const [index, view] of spec.bufferViews.entries()) {
    const original = binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
    const accessors = spec.accessors.filter(accessor => accessor.bufferView === index);
    if (!accessors.length) {
      view.byteOffset = append(original);
      continue;
    }
    const strides = { SCALAR: 2, VEC2: 8, VEC3: 12 };
    const unique = new Map();
    const start = Math.ceil(length / 4) * 4;
    for (const accessor of accessors) {
      const stride = strides[accessor.type];
      const offset = accessor.byteOffset ?? 0;
      if (accessor.sparse || !stride || (stride === 2 ? accessor.componentType !== 5123 : accessor.componentType !== 5126) ||
          (view.byteStride && view.byteStride !== stride) || offset + accessor.count * stride > original.length) {
        throw new Error('Unexpected BMW GLB accessor layout.');
      }
      const bytes = original.subarray(offset, offset + accessor.count * stride);
      const key = createHash('sha256').update(bytes).digest('hex');
      if (!unique.has(key)) unique.set(key, append(bytes) - start);
      accessor.byteOffset = unique.get(key);
    }
    view.byteOffset = start;
    view.byteLength = length - start;
  }

  append(Buffer.alloc(0));
  spec.buffers[0].byteLength = length;
  const json = Buffer.from(JSON.stringify(spec));
  const alignedJson = Buffer.alloc(Math.ceil(json.length / 4) * 4, 0x20);
  json.copy(alignedJson);
  const header = Buffer.from(glb.subarray(0, 20));
  header.writeUInt32LE(header.length + alignedJson.length + 8 + length, 8);
  header.writeUInt32LE(alignedJson.length, 12);
  const binaryHeader = Buffer.alloc(8);
  binaryHeader.writeUInt32LE(length);
  binaryHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, alignedJson, binaryHeader, ...binaryParts]);
}

const model = deduplicateGeometry(source);
const modelHash = createHash('sha256').update(model).digest('hex');
await mkdir(new URL('public/', project), { recursive: true });
const temporary = new URL(destination.href + '.' + process.pid + '.tmp');
await writeFile(temporary, model);
await rename(temporary, destination);

// Group the byte lanes of the geometry streams before deflate. The loader
// restores the exact byte order before GLTFLoader sees the model.
const jsonLength = model.readUInt32LE(12);
const spec = JSON.parse(model.subarray(20, 20 + jsonLength));
const shuffled = Buffer.from(model);
const lanes = [];
for (const view of spec.bufferViews) {
  if (view.target !== 34962 && view.target !== 34963) continue;
  const stride = view.target === 34963 ? 2 : 4;
  const start = 28 + jsonLength + view.byteOffset;
  const count = view.byteLength / stride;
  if (!Number.isInteger(count)) throw new Error('Misaligned BMW geometry stream.');
  lanes.push({ start, count, stride });
  for (let lane = 0; lane < stride; lane++) {
    for (let i = 0; i < count; i++) shuffled[start + lane * count + i] = model[start + i * stride + lane];
  }
}

// Small independently retriable downloads for the public showroom.
const packed = gzipSync(shuffled, { level: 9 });
const partSize = 2 * 1024 * 1024;
const assetPrefix = 'public/bmw-compact-' + modelHash.slice(0, 12);
const lengths = [];
for (let offset = 0; offset < packed.length; offset += partSize) {
  const part = packed.subarray(offset, offset + partSize);
  await writeFile(new URL(assetPrefix + '-' + lengths.length + '.bin', project), part);
  lengths.push(part.length);
}
await writeFile(new URL(assetPrefix + '.json', project), JSON.stringify({ lengths, lanes, byteLength: model.length }));
console.log(`BMW download: ${packed.length} bytes in ${lengths.length} parts (GLB: ${model.length} bytes, SHA-256: ${modelHash})`);
