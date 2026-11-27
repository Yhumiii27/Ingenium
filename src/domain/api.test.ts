import { describe, expect, it } from 'vitest';
import { apiIndex } from './api';
import { isPublicPath } from './auth';

describe('business API skeleton', () => {
  it('opens no endpoint yet and lists the planned ones', () => {
    const i = apiIndex();
    expect(i).toMatchObject({ api: 'ingenium', version: 'v1', endpoints: [] });
    expect(i.planned.every((e) => e.path.startsWith('/api/v1/'))).toBe(true);
  });
  it('is reached without a session cookie (it authenticates its own callers)', () => {
    expect(isPublicPath('/api/v1')).toBe(true);
    expect(isPublicPath('/api/v1/part-requests')).toBe(true);
    expect(isPublicPath('/api/v10')).toBe(false);
  });
});
