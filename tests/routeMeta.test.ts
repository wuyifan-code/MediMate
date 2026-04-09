import { describe, expect, it } from 'vitest';
import { buildNavigationItems } from '../components/layout/navConfig';
import { resolveRouteMeta, routeToPageType } from '../src/routes/routeMeta';

describe('route meta', () => {
  it('maps nested message routes to the messages page type', () => {
    expect(routeToPageType('/messages/escort-123')).toBe('messages');
  });

  it('returns search route metadata when search mode is active', () => {
    const meta = resolveRouteMeta('/explore', 'zh', true);

    expect(meta.pageType).toBe('explore');
    expect(meta.showRightPanel).toBe(false);
    expect(meta.transitionPreset).toBe('slide-left');
    expect(meta.title).toBe('搜索结果');
  });

  it('uses immersive layout for the live messaging scene', () => {
    const meta = resolveRouteMeta('/messages/escort-123', 'en');

    expect(meta.layoutVariant).toBe('immersive');
    expect(meta.immersive).toBe(true);
    expect(meta.showRightPanel).toBe(false);
  });
});

describe('navigation config', () => {
  it('keeps the primary pages in a predictable order', () => {
    const items = buildNavigationItems('en');

    expect(items.map((item) => item.pageType)).toEqual([
      'home',
      'explore',
      'notifications',
      'messages',
      'orders',
      'profile',
      'settings',
    ]);
  });

  it('localizes the top-level navigation labels', () => {
    const chineseLabels = buildNavigationItems('zh').map((item) => item.label);
    const englishLabels = buildNavigationItems('en').map((item) => item.label);

    expect(chineseLabels).toContain('工作台');
    expect(chineseLabels).toContain('订单');
    expect(englishLabels).toContain('Home');
    expect(englishLabels).toContain('Orders');
  });
});
