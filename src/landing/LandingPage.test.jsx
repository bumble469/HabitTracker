// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LandingPage from './LandingPage';

let root;
let container;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe('public product introduction', () => {
  it('does not invent account activity, prechecked routines, or a personal dashboard', async () => {
    await act(async () => root.render(<LandingPage />));
    expect(container.querySelector('.lp-mini-stats')).toBeNull();
    expect(container.querySelector('.lp-mini-heatmap')).toBeNull();
    expect(container.querySelector('[role="progressbar"]')).toBeNull();
    expect(container.querySelector('button[aria-pressed]')).toBeNull();
    expect(container.textContent).not.toMatch(/112-day|72 active|Today’s routines/);
    expect([...container.querySelectorAll('h2,h3')].some((heading) => heading.textContent === 'Your activity')).toBe(false);
    expect(container.textContent).toContain('Your personal progress starts after you sign in.');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('offers a real video file with controls, captions, transcript, and an honest media disclosure', async () => {
    await act(async () => root.render(<LandingPage />));
    const video = container.querySelector('video');
    expect(video.controls).toBe(true);
    expect(video.getAttribute('preload')).toBe('none');
    expect(video.autoplay).toBe(false);
    expect(video.querySelector('source').getAttribute('src')).toBe(`${import.meta.env.BASE_URL}landing/media/product-walkthrough.mp4`);
    expect(video.querySelector('track[kind="captions"]').getAttribute('src')).toContain('product-walkthrough.en.vtt');
    expect(container.querySelector('#lp-video-description').textContent).toContain('not a recording of a personal account');
    expect(container.querySelector('.lp-transcript').textContent).toContain('Your activity, active days, streaks, and insights come from your own saved check-ins.');
    expect(container.querySelectorAll('img[alt*="Illustrat"]')).toHaveLength(4);
    expect([...container.querySelectorAll('figcaption')].every((caption) => caption.textContent.includes('no account data'))).toBe(true);
  });

  it('keeps every Get started action on the login/sign-up entry and preserves mobile navigation', async () => {
    await act(async () => root.render(<LandingPage />));
    const startLinks = [...container.querySelectorAll('a')].filter((link) => link.textContent.includes('Get started'));
    expect(startLinks.length).toBeGreaterThanOrEqual(3);
    startLinks.forEach((link) => expect(link.getAttribute('href')).toBe(`${import.meta.env.BASE_URL}app`));
    expect(container.querySelector(`a[href="${import.meta.env.BASE_URL}app?mode=register"]`)).toBeTruthy();
    const menu = container.querySelector('.lp-menu-toggle');
    await act(async () => menu.click());
    expect(container.querySelector('#lp-mobile-nav').hidden).toBe(false);
    await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(container.querySelector('#lp-mobile-nav').hidden).toBe(true);
    expect(document.activeElement).toBe(menu);
  });

  it('explains real capabilities and keeps visitor questions available without signing in', async () => {
    await act(async () => root.render(<LandingPage />));
    expect(container.querySelector('#the-product').textContent).toContain('daily check-in');
    expect(container.querySelector('#how-it-works').textContent).toContain('Choose the weekdays');
    expect(container.querySelector('#how-it-works').textContent).toContain('Days when you completed at least one habit.');
    expect(container.querySelector('#questions').textContent).toContain('does not load your habits');
    expect(container.querySelectorAll('.lp-faq-list details')).toHaveLength(5);
    expect(fetch).not.toHaveBeenCalled();
  });
});
