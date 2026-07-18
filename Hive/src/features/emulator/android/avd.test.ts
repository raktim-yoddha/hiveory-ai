import { describe, it, expect } from 'vitest';
import {
  DEVICE_PROFILES, sanitizeAvdName, validateSpec, buildAvdIni, buildConfigIni,
  tagIdFromDir, tagIdsFromDir, tagDisplayNamesFromDir, imagePlayStore, vmHeapMb, winJoin,
  type AvdSpec, type SystemImage,
} from './avd';

const playImage: SystemImage = {
  apiDir: 'android-37.1',
  tagDir: 'google_apis_playstore_ps16k',
  abi: 'x86_64',
  playStore: true,
  label: 'Android 37.1 · Google Play · x86_64',
};

const spec = (over: Partial<AvdSpec> = {}): AvdSpec => ({
  name: 'Test_Phone',
  displayName: 'Test Phone',
  device: DEVICE_PROFILES[0],
  image: playImage,
  ramMb: 2048,
  dataSizeGb: 8,
  cores: 4,
  ...over,
});

describe('tagIdFromDir', () => {
  // The dir carries qualifiers the emulator's tag.id must not, e.g. the
  // "_ps16k" (16KB page size) suffix on this machine's only image.
  it('strips directory qualifiers from the tag id', () => {
    expect(tagIdFromDir('google_apis_playstore_ps16k')).toBe('google_apis_playstore');
    expect(tagIdFromDir('google_apis_playstore')).toBe('google_apis_playstore');
    expect(tagIdFromDir('google_apis_ps16k')).toBe('google_apis');
    expect(tagIdFromDir('default')).toBe('default');
  });

  it('detects Play Store images', () => {
    expect(imagePlayStore('google_apis_playstore_ps16k')).toBe(true);
    expect(imagePlayStore('google_apis')).toBe(false);
  });

  // tag.ids keeps the qualifier that tag.id drops — matching what Android
  // Studio writes for the same image.
  it('keeps qualifiers in tag.ids / tag.displaynames', () => {
    expect(tagIdsFromDir('google_apis_playstore_ps16k')).toBe('google_apis_playstore,page_size_16kb');
    expect(tagDisplayNamesFromDir('google_apis_playstore_ps16k')).toBe('Google APIs PlayStore,Page Size 16KB');
  });

  it('leaves an unqualified image alone', () => {
    expect(tagIdsFromDir('google_apis_playstore')).toBe('google_apis_playstore');
    expect(tagDisplayNamesFromDir('google_apis')).toBe('Google APIs');
  });
});

describe('winJoin', () => {
  // Rust hands us the SDK path from PathBuf::to_string_lossy. `join("a/b")`
  // keeps forward slashes on Windows, so the input can be mixed. config.ini
  // must still get a clean Windows path.
  it('normalizes mixed separators', () => {
    expect(winJoin(String.raw`C:\Users\me\AppData/Local/Android/Sdk`, 'skins', 'pixel_7'))
      .toBe(String.raw`C:\Users\me\AppData\Local\Android\Sdk\skins\pixel_7`);
  });

  it('collapses duplicate separators and trims stray ones', () => {
    // Plain strings here: String.raw cannot end in a backslash.
    expect(winJoin('C:\\Sdk\\', '\\skins\\', 'pixel_7'))
      .toBe(String.raw`C:\Sdk\skins\pixel_7`);
  });

  it('leaves an already-clean path alone', () => {
    expect(winJoin(String.raw`C:\Sdk`, 'skins')).toBe(String.raw`C:\Sdk\skins`);
  });
});

describe('vmHeapMb', () => {
  it('scales the dalvik heap with RAM', () => {
    expect(vmHeapMb(1024)).toBe(256);
    expect(vmHeapMb(2048)).toBe(384); // matches Android Studio at 2GB
    expect(vmHeapMb(4096)).toBe(512);
    expect(vmHeapMb(8192)).toBe(1024);
  });
});

describe('sanitizeAvdName', () => {
  it('replaces characters the emulator rejects', () => {
    expect(sanitizeAvdName('My Phone!')).toBe('My_Phone');
    expect(sanitizeAvdName('  spaced  out ')).toBe('spaced_out');
    expect(sanitizeAvdName('a/b\\c:d')).toBe('a_b_c_d');
  });

  it('keeps legal characters', () => {
    expect(sanitizeAvdName('Pixel_7.Pro-x86')).toBe('Pixel_7.Pro-x86');
  });

  it('caps length', () => {
    expect(sanitizeAvdName('x'.repeat(80)).length).toBe(50);
  });
});

describe('validateSpec', () => {
  it('accepts a sane spec', () => {
    expect(validateSpec(spec())).toEqual([]);
  });

  it('rejects a duplicate name case-insensitively', () => {
    const errs = validateSpec(spec({ name: 'Pixel_7_Pro' }), ['pixel_7_pro']);
    expect(errs.join()).toMatch(/already exists/);
  });

  it('rejects off-menu RAM and storage', () => {
    expect(validateSpec(spec({ ramMb: 3000 })).join()).toMatch(/RAM must be/);
    expect(validateSpec(spec({ dataSizeGb: 7 })).join()).toMatch(/Storage must be/);
  });

  it('rejects an empty or illegal name', () => {
    expect(validateSpec(spec({ name: '' })).join()).toMatch(/required/);
    expect(validateSpec(spec({ name: 'bad name' })).join()).toMatch(/may only contain/);
  });

  it('bounds cores', () => {
    expect(validateSpec(spec({ cores: 0 })).join()).toMatch(/Cores/);
    expect(validateSpec(spec({ cores: 32 })).join()).toMatch(/Cores/);
  });
});

describe('buildAvdIni', () => {
  it('points at the .avd directory and target', () => {
    const ini = buildAvdIni(spec(), 'C:\\Users\\me\\.android\\avd');
    expect(ini).toContain('path=C:\\Users\\me\\.android\\avd\\Test_Phone.avd');
    expect(ini).toContain('path.rel=avd\\Test_Phone.avd');
    expect(ini).toContain('target=android-37.1');
  });
});

describe('buildConfigIni', () => {
  const cfg = buildConfigIni(spec(), 'C:\\Sdk', 1234);

  it('writes the sysdir the emulator resolves images from', () => {
    expect(cfg).toContain('image.sysdir.1=system-images\\android-37.1\\google_apis_playstore_ps16k\\x86_64\\');
  });

  it('bakes the hardware the user picked', () => {
    expect(cfg).toContain('hw.ramSize=2048');
    expect(cfg).toContain('disk.dataPartition.size=8G');
    expect(cfg).toContain('hw.lcd.width=1440');
    expect(cfg).toContain('hw.lcd.height=3120');
    expect(cfg).toContain('hw.lcd.density=560');
    expect(cfg).toContain('hw.cpu.ncore=4');
  });

  it('enables the Play Store for a playstore image', () => {
    expect(cfg).toContain('PlayStore.enabled=true');
    expect(cfg).toContain('tag.id=google_apis_playstore');
  });

  it('disables the Play Store for a non-playstore image', () => {
    const noPlay = buildConfigIni(
      spec({ image: { ...playImage, tagDir: 'google_apis', playStore: false } }),
      'C:\\Sdk',
    );
    expect(noPlay).toContain('PlayStore.enabled=false');
    expect(noPlay).toContain('tag.id=google_apis');
  });

  it('marks the spec locked — built hardware is immutable', () => {
    expect(cfg).toContain('hiveory.locked=true');
    expect(cfg).toContain('hiveory.createdAt=1234');
  });

  it('resolves the skin under the SDK so the emulator finds it', () => {
    expect(cfg).toContain('skin.path=C:\\Sdk\\skins\\pixel_7_pro');
    expect(cfg).toContain('skin.name=pixel_7_pro');
  });

  it('normalizes a mixed-separator SDK path to all backslashes', () => {
    // Rust can hand over `C:\Users\me\AppData\Local/Android/Sdk`.
    const mixed = buildConfigIni(spec(), 'C:\\Users\\me\\AppData\\Local/Android/Sdk');
    const line = mixed.split('\n').find((l) => l.startsWith('skin.path'))!;
    expect(line).toBe('skin.path=C:\\Users\\me\\AppData\\Local\\Android\\Sdk\\skins\\pixel_7_pro');
    expect(line).not.toContain('/');
  });
});
