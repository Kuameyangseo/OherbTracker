import { describe, expect, it } from '@jest/globals';
import reportRouter from './report.routes.js';

describe('operational report route access', () => {
  it('protects preview and export endpoints with staff authorization', () => {
    const routes = (reportRouter as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: unknown[] } }> }).stack
      .map((layer) => layer.route)
      .filter((route): route is { path: string; methods: Record<string, boolean>; stack: unknown[] } => Boolean(route));
    expect(routes.map((route) => route.path)).toEqual(['/preview', '/export', '/:reportType/preview', '/:reportType/export']);
    expect(routes.every((route) => route.methods.get && route.stack).valueOf()).toBe(true);
    expect(routes.every((route) => route.stack.length === 3)).toBe(true);
  });
});
