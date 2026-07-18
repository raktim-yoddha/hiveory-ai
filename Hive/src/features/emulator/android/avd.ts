/**
 * Android AVD specs — pure, no I/O.
 *
 * An AVD is just a `<name>.ini` plus a `<name>.avd/config.ini` under the AVD
 * home; `avdmanager` only writes those files. We generate them directly so the
 * feature works without the `cmdline-tools` package installed (it commonly
 * isn't — Android Studio doesn't install it by default).
 *
 * A built emulator is immutable: hardware is baked at creation, matching real
 * devices. Changing RAM/resolution later would invalidate the userdata image, so
 * the UI offers rebuild, not edit.
 */

export interface DeviceProfile {
  id: string;
  name: string;
  manufacturer: string;
  /** Native resolution in px. */
  width: number;
  height: number;
  /** dpi */
  density: number;
}

/** Skins that ship with the SDK, so `skin.path` resolves. */
export const DEVICE_PROFILES: DeviceProfile[] = [
  { id: 'pixel_7_pro', name: 'Pixel 7 Pro', manufacturer: 'Google', width: 1440, height: 3120, density: 560 },
  { id: 'pixel_7',     name: 'Pixel 7',     manufacturer: 'Google', width: 1080, height: 2400, density: 420 },
  { id: 'pixel_6',     name: 'Pixel 6',     manufacturer: 'Google', width: 1080, height: 2400, density: 420 },
  { id: 'pixel_5',     name: 'Pixel 5',     manufacturer: 'Google', width: 1080, height: 2340, density: 440 },
  { id: 'pixel_4',     name: 'Pixel 4',     manufacturer: 'Google', width: 1080, height: 2280, density: 440 },
  { id: 'pixel_tablet', name: 'Pixel Tablet', manufacturer: 'Google', width: 1600, height: 2560, density: 276 },
];

/** A system image installed under `<sdk>/system-images/`. */
export interface SystemImage {
  /** e.g. "android-37.1" */
  apiDir: string;
  /** e.g. "google_apis_playstore_ps16k" */
  tagDir: string;
  /** e.g. "x86_64" */
  abi: string;
  /** Whether this image ships the Play Store. */
  playStore: boolean;
  /** Human label, e.g. "Android 37.1 · Google Play · x86_64". */
  label: string;
}

export interface AvdSpec {
  /** Filesystem-safe id, also the emulator's -avd argument. */
  name: string;
  displayName: string;
  device: DeviceProfile;
  image: SystemImage;
  ramMb: number;
  dataSizeGb: number;
  cores: number;
}

export const RAM_CHOICES = [1024, 2048, 4096, 8192] as const;
export const STORAGE_CHOICES = [2, 4, 8, 16, 32] as const;

/**
 * `tag.id` the emulator expects. The directory can carry extra qualifiers
 * (e.g. `_ps16k` for 16KB page size), but the tag itself must not.
 */
export function tagIdFromDir(tagDir: string): string {
  if (tagDir.startsWith('google_apis_playstore')) return 'google_apis_playstore';
  if (tagDir.startsWith('google_apis')) return 'google_apis';
  if (tagDir.startsWith('android-wear')) return 'android-wear';
  if (tagDir.startsWith('google_atd')) return 'google_atd';
  if (tagDir.startsWith('aosp_atd')) return 'aosp_atd';
  return 'default';
}

export function imagePlayStore(tagDir: string): boolean {
  return tagDir.includes('playstore');
}

/** Qualifiers appended to an image dir, e.g. `_ps16k` -> 16KB page size. */
const QUALIFIERS: { suffix: string; id: string; display: string }[] = [
  { suffix: 'ps16k', id: 'page_size_16kb', display: 'Page Size 16KB' },
];

/**
 * `tag.ids` — the base tag plus any qualifier the image dir encodes.
 *
 * The dir `google_apis_playstore_ps16k` is tag `google_apis_playstore` *and*
 * `page_size_16kb`. Android Studio writes both; dropping the qualifier makes the
 * AVD misdescribe the image it boots.
 */
export function tagIdsFromDir(tagDir: string): string {
  const ids = [tagIdFromDir(tagDir)];
  for (const q of QUALIFIERS) if (tagDir.endsWith(`_${q.suffix}`)) ids.push(q.id);
  return ids.join(',');
}

export function tagDisplayFromDir(tagDir: string): string {
  return imagePlayStore(tagDir) ? 'Google APIs PlayStore' : 'Google APIs';
}

export function tagDisplayNamesFromDir(tagDir: string): string {
  const names = [tagDisplayFromDir(tagDir)];
  for (const q of QUALIFIERS) if (tagDir.endsWith(`_${q.suffix}`)) names.push(q.display);
  return names.join(',');
}

/** AVD names may only contain letters, digits, dot, dash and underscore. */
export function sanitizeAvdName(input: string): string {
  return input
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);
}

export function validateSpec(spec: AvdSpec, existingNames: string[] = []): string[] {
  const errors: string[] = [];
  if (!spec.name) errors.push('Name is required.');
  if (spec.name && spec.name !== sanitizeAvdName(spec.name)) {
    errors.push('Name may only contain letters, numbers, dot, dash and underscore.');
  }
  if (existingNames.some((n) => n.toLowerCase() === spec.name.toLowerCase())) {
    errors.push(`An emulator named "${spec.name}" already exists.`);
  }
  if (!RAM_CHOICES.includes(spec.ramMb as (typeof RAM_CHOICES)[number])) {
    errors.push(`RAM must be one of ${RAM_CHOICES.join(', ')} MB.`);
  }
  if (!STORAGE_CHOICES.includes(spec.dataSizeGb as (typeof STORAGE_CHOICES)[number])) {
    errors.push(`Storage must be one of ${STORAGE_CHOICES.join(', ')} GB.`);
  }
  if (spec.cores < 1 || spec.cores > 16) errors.push('Cores must be between 1 and 16.');
  return errors;
}

/**
 * Windows-style path join for values written into config files.
 *
 * Normalizes `/` to `\`: the SDK path arrives from the host and may carry mixed
 * separators, and a mixed `skin.path` is not something the emulator should be
 * asked to interpret.
 */
export function winJoin(...parts: string[]): string {
  return parts
    .filter(Boolean)
    .map((s, i) => (i === 0 ? s.replace(/[\\/]+$/, '') : s.replace(/^[\\/]+|[\\/]+$/g, '')))
    .join('\\')
    .replace(/\//g, '\\')
    .replace(/\\{2,}/g, '\\');
}

/**
 * `<avdHome>/<name>.ini` — the pointer file the emulator reads to find the AVD.
 */
export function buildAvdIni(spec: AvdSpec, avdHome: string): string {
  const avdDir = winJoin(avdHome, `${spec.name}.avd`);
  return [
    'avd.ini.encoding=UTF-8',
    `path=${avdDir}`,
    `path.rel=avd\\${spec.name}.avd`,
    `target=${spec.image.apiDir}`,
    '',
  ].join('\n');
}

/**
 * `<avdHome>/<name>.avd/config.ini` — the hardware profile.
 *
 * Modelled on a config.ini written by Android Studio itself, so the emulator
 * accepts it. `hiveory.*` keys are ours: ignored by the emulator, and they mark
 * the spec as locked so the UI never offers to edit baked hardware.
 */
export function buildConfigIni(spec: AvdSpec, sdkPath: string, createdAt = Date.now()): string {
  const sysdir = winJoin('system-images', spec.image.apiDir, spec.image.tagDir, spec.image.abi) + '\\';
  const lines = [
    `AvdId=${spec.name}`,
    `PlayStore.enabled=${spec.image.playStore ? 'true' : 'false'}`,
    `abi.type=${spec.image.abi}`,
    `avd.ini.displayname=${spec.displayName}`,
    'avd.ini.encoding=UTF-8',
    `disk.dataPartition.size=${spec.dataSizeGb}G`,
    // Snapshot behaviour: fast boot after the first cold boot.
    'fastboot.chosenSnapshotFile=',
    'fastboot.forceChosenSnapshotBoot=no',
    'fastboot.forceColdBoot=no',
    'fastboot.forceFastBoot=yes',
    'hw.accelerometer=yes',
    'hw.arc=false',
    'hw.audioInput=yes',
    'hw.battery=yes',
    'hw.camera.back=virtualscene',
    'hw.camera.front=emulated',
    `hw.cpu.arch=${spec.image.abi}`,
    `hw.cpu.ncore=${spec.cores}`,
    'hw.dPad=no',
    `hw.device.manufacturer=${spec.device.manufacturer}`,
    `hw.device.name=${spec.device.id}`,
    'hw.gps=yes',
    'hw.gpu.enabled=yes',
    'hw.gpu.mode=auto',
    'hw.gyroscope=yes',
    'hw.initialOrientation=portrait',
    'hw.keyboard=yes',
    `hw.lcd.density=${spec.device.density}`,
    `hw.lcd.height=${spec.device.height}`,
    `hw.lcd.width=${spec.device.width}`,
    'hw.mainKeys=no',
    `hw.ramSize=${spec.ramMb}`,
    'hw.sdCard=yes',
    'hw.sensors.light=yes',
    'hw.sensors.magnetic_field=yes',
    'hw.sensors.orientation=yes',
    'hw.sensors.pressure=yes',
    'hw.sensors.proximity=yes',
    'hw.trackBall=no',
    `image.sysdir.1=${sysdir}`,
    'runtime.network.latency=none',
    'runtime.network.speed=full',
    'sdcard.size=512M',
    'showDeviceFrame=yes',
    'skin.dynamic=yes',
    `skin.name=${spec.device.id}`,
    `skin.path=${winJoin(sdkPath, 'skins', spec.device.id)}`,
    `tag.display=${tagDisplayFromDir(spec.image.tagDir)}`,
    `tag.displaynames=${tagDisplayNamesFromDir(spec.image.tagDir)}`,
    `tag.id=${tagIdFromDir(spec.image.tagDir)}`,
    `tag.ids=${tagIdsFromDir(spec.image.tagDir)}`,
    `target=${spec.image.apiDir}`,
    `vm.heapSize=${vmHeapMb(spec.ramMb)}`,
    // Ours: hardware is baked at build time; the UI reads this and offers
    // rebuild rather than edit.
    'hiveory.locked=true',
    `hiveory.createdAt=${createdAt}`,
    '',
  ];
  return lines.join('\n');
}

/** Dalvik heap per app. Android Studio scales this with RAM; 384 at 2GB. */
export function vmHeapMb(ramMb: number): number {
  if (ramMb >= 8192) return 1024;
  if (ramMb >= 4096) return 512;
  if (ramMb >= 2048) return 384;
  return 256;
}
