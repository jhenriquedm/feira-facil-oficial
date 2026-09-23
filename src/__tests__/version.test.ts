import { describe, it, expect } from 'vitest';
import { APP_VERSION_INFO } from '../version';

describe('App Versioning and Metadata', () => {
  it('has semantic version format and build numbers', () => {
    expect(APP_VERSION_INFO.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(APP_VERSION_INFO.buildNumber).toBeGreaterThan(0);
    expect(APP_VERSION_INFO.packageId).toBe('com.mindflow.mercadofacil');
    expect(APP_VERSION_INFO.targetSdkVersion).toBe(34);
  });

  it('contains changelog with release notes', () => {
    expect(APP_VERSION_INFO.changelog.length).toBeGreaterThan(0);
    const latest = APP_VERSION_INFO.changelog[0];
    expect(latest.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(latest.highlights.length).toBeGreaterThan(0);
  });
});
