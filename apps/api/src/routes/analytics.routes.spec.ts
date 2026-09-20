import { describe, expect, it } from '@jest/globals';
import analyticsRouter from './analytics.routes.js';

describe('analytics route access', () => {
  it('protects the overview endpoint with authentication and staff access', () => {
    const route = (analyticsRouter as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: unknown[] } }> }).stack
      .find((layer) => layer.route?.path === '/overview')?.route;
    expect(route?.methods.get).toBe(true);
    expect(route?.stack).toHaveLength(3);
  });
});
