import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify, styleText } from 'node:util';
import type { InspectColor } from 'node:util';
import { brotliCompress } from 'node:zlib';
import sharp from 'sharp';
import type { Sharp } from 'sharp';
import { optimize as optimizeSvg } from 'svgo';
import type { Plugin } from 'vite';

interface Log { info: (message: string) => void }

type Paint = (value: string) => string;

interface ImageRow { after: number; before: number; name: string }

interface OutputRow { br: number | null; name: string; raw: number }

type CompressedRow = OutputRow & { br: number };

interface Line { after: number; before: number; name: string; tint: Paint }

interface Style { gain: Paint; size: Paint }

export interface OutputLifecycle {
  closeBundle: () => Promise<void>;
  configResolved: (config: { build: { outDir: string }; logger: Log }) => void;
  writeBundle: () => Promise<void>;
}

const compress = promisify(brotliCompress);
const MIN_BYTES = 1400;
const PRECOMPRESS = /\.(?:js|css|html|svg|json|txt)$/u;
const IMAGES = /\.(?:png|jpe?g|webp|avif|svg)$/u;
const HASH = /-[\w-]{8}(?=\.[^.]*$)/u;

const BUCKETS = [
  ['js', /\.js$/u],
  ['css', /\.css$/u],
  ['fonts', /\.(?:woff2?|ttf|otf|eot)$/u],
  ['images', /\.(?:png|jpe?g|webp|avif|gif|svg|ico)$/u],
] as const;

const encode = new Map<string, (image: Sharp) => Sharp>([
  ['.png', (image) => image.png({ effort: 7, palette: true, quality: 80 })],
  ['.jpg', (image) => image.jpeg({ mozjpeg: true, quality: 80 })],
  ['.jpeg', (image) => image.jpeg({ mozjpeg: true, quality: 80 })],
  ['.webp', (image) => image.webp({ effort: 6, quality: 80 })],
  ['.avif', (image) => image.avif({ effort: 5, quality: 60 })],
]);

const paint =
  (...format: Array<InspectColor>): Paint =>
  (value) =>
    styleText(format, value);

const plain: Paint = (value) => value;
const dim = paint('dim');
const bold = paint('bold');
const DATA: Style = { gain: paint('green'), size: dim };
const TOTAL: Style = { gain: paint('bold', 'green'), size: bold };

const TINTS = new Map<string, Paint>([
  ['js', paint('cyan')],
  ['css', paint('magenta')],
  ['fonts', paint('yellow')],
  ['images', paint('blue')],
]);

const bucketOf = (name: string): string =>
  BUCKETS.find(([, pattern]) => pattern.test(name))?.[0] ?? 'other';

const tintOf = (bucket: string): Paint => TINTS.get(bucket) ?? plain;

const sum = <T>(rows: ReadonlyArray<T>, pick: (item: T) => number): number =>
  rows.reduce((total, item) => total + pick(item), 0);

const transfer = (item: OutputRow): number => item.br ?? item.raw;
const kilobytes = (value: number): string => `${(value / 1000).toFixed(2)} kB`.padStart(9);
const fileCount = (count: number): string => `${String(count)} file${count === 1 ? '' : 's'}`;

const decorate = function decorate(name: string, tint: Paint): string {
  const cut = name.lastIndexOf('/') + 1;
  const directory = cut === 0 ? '' : dim(name.slice(0, cut));
  const base = name.slice(cut);
  const hash = HASH.exec(base);

  if (!hash) {
    return directory + tint(base);
  }

  const end = hash.index + hash[0].length;

  return directory + tint(base.slice(0, hash.index)) + dim(hash[0]) + tint(base.slice(end));
}

const percentage = function percentage(before: number, after: number): string {
  const change = before === 0 ? 0 : Math.round(((after - before) / before) * 100);

  return `${String(change)}%`.padStart(5);
}

const row = function row(label: string, before: number, after: number, style: Style): string {
  const afterStyle = after < before ? style.gain : style.size;

  return `  ${label} ${style.size(kilobytes(before))} ${dim('→')} ${afterStyle(kilobytes(after))} ${style.size(percentage(before, after))}`;
}

const table = function table(
  log: Log,
  title: string,
  note: string,
  lines: ReadonlyArray<Line>,
  count = lines.length,
) {
  if (lines.length === 0) {
    return;
  }

  const total = fileCount(count);
  const width = Math.max(...lines.map((line) => line.name.length), total.length);

  const suffix = note === '' ? '' : ` ${dim(note)}`;
  log.info(`\n${bold(title)}${suffix}`);

  for (const line of lines) {
    const label = decorate(line.name, line.tint) + ' '.repeat(width - line.name.length);
    log.info(row(label, line.before, line.after, DATA));
  }

  const before = sum(lines, (line) => line.before);
  const after = sum(lines, (line) => line.after);
  log.info(row(bold(total.padEnd(width)), before, after, TOTAL));
}

const shrinkRaster = function shrinkRaster(raw: Buffer, extension: string): Promise<Buffer> | null {
  const encoder = encode.get(extension);

  if (encoder === undefined) {
    return null;
  }

  return encoder(sharp(raw).autoOrient()).toBuffer();
}

const shrinkImage = async function shrinkImage(outDir: string, name: string): Promise<ImageRow | null> {
  const file = path.join(outDir, name);
  const raw = await readFile(file);

  const optimized = name.endsWith('.svg')
    ? Buffer.from(optimizeSvg(raw.toString('utf8'), { multipass: true, path: name }).data)
    : await shrinkRaster(raw, path.extname(name));

  if (optimized === null || optimized.byteLength >= raw.byteLength) {
    return null;
  }

  await writeFile(file, optimized);

  return { after: optimized.byteLength, before: raw.byteLength, name };
}

const measureOutput = async function measureOutput(outDir: string, name: string): Promise<OutputRow | null> {
  const file = path.join(outDir, name);
  const info = await stat(file);

  if (!info.isFile()) {
    return null;
  }

  if (!PRECOMPRESS.test(name) || info.size < MIN_BYTES) {
    return { br: null, name, raw: info.size };
  }

  const compressed = await compress(await readFile(file));
  await writeFile(`${file}.br`, compressed);

  return { br: compressed.byteLength, name, raw: info.size };
}

const logImages = function logImages(log: Log, outDir: string, rows: ReadonlyArray<ImageRow>): void {
  const lines = rows
    .toSorted((a, b) => b.after - a.after)
    .map((item) => ({
      after: item.after,
      before: item.before,
      name: item.name,
      tint: tintOf(bucketOf(item.name)),
    }));

  table(log, 'images', `(${outDir}/)`, lines);
}

const logPrecompressed = function logPrecompressed(log: Log, outDir: string, rows: ReadonlyArray<OutputRow>): void {
  const lines = rows
    .filter((item): item is CompressedRow => item.br !== null)
    .toSorted((a, b) => b.br - a.br)
    .map((item) => ({
      after: item.br,
      before: item.raw,
      name: item.name,
      tint: tintOf(bucketOf(item.name)),
    }));

  table(log, 'brotli', `(${outDir}/, ${String(MIN_BYTES)} bytes and up)`, lines);
}

const logTotal = function logTotal(log: Log, outDir: string, rows: ReadonlyArray<OutputRow>): void {
  const lines = [...Map.groupBy(rows, (item) => bucketOf(item.name))]
    .map(([bucket, group]) => ({
      after: sum(group, transfer),
      before: sum(group, (item) => item.raw),
      name: bucket,
      tint: tintOf(bucket),
    }))
    .toSorted((a, b) => b.after - a.after);

  table(log, `${outDir}/ total`, '', lines, rows.length);
}

export const createOutputLifecycle = function createOutputLifecycle(): OutputLifecycle {
  let outDir = 'dist';
  let log: Log | undefined;
  let images: Array<ImageRow> = [];

  return {
    async closeBundle() {
      const names = await readdir(outDir, { recursive: true });

      const measured = await Promise.all(
        names.flatMap((name) => (name.endsWith('.br') ? [] : [measureOutput(outDir, name)])),
      );

      const rows = measured.filter((item) => item !== null);

      if (log === undefined) {
        return;
      }

      logImages(log, outDir, images);
      logPrecompressed(log, outDir, rows);
      logTotal(log, outDir, rows);
    },
    configResolved(config) {
      ({ outDir } = config.build);
      log = config.logger;
    },
    async writeBundle() {
      const names = await readdir(outDir, { recursive: true });

      const rows = await Promise.all(
        names.flatMap((name) => (IMAGES.test(name) ? [shrinkImage(outDir, name)] : [])),
      );

      images = rows.filter((item) => item !== null);
    },
  };
}

export const output = function output(): Plugin {
  return {
    apply: 'build',
    enforce: 'post',
    name: 'build-output',
    ...createOutputLifecycle(),
  };
}
