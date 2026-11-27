// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CoachChat from './CoachChat';
import { api } from '../services/api';
vi.mock('../services/api', () => ({ api: vi.fn() }));
let root, container, conversations, messages;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const user = { id: 'user-a', timezone: 'Asia/Kolkata', ai_enabled: true };
const conversation = {
  id: 'opaque-chat-id',
  title: 'Help me read',
  created_at: '2026-11-24T08:00:00',
  updated_at: '2026-11-24T08:00:00',
};
const initial = [
  {
    id: 1,
    role: 'user',
    content: 'Help me read',
    sources: null,
    created_at: '2026-11-24T08:00:00',
  },
  {
    id: 2,
    role: 'assistant',
    content: 'Coach not connected yet.',
    sources: [],
    created_at: '2026-11-24T08:00:01',
  },
];
const button = (name, scope = container) =>
  [...scope.querySelectorAll('button')].find(
    (element) => element.textContent.trim() === name
  );
const click = async (name, scope) =>
  act(async () => button(name, scope).click());
const typeMessage = async (text) =>
  act(async () => {
    const field = container.querySelector('textarea');
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      'value'
    ).set.call(field, text);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
const submit = () =>
  act(async () =>
    container
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  );
const mount = (props = {}) =>
  act(async () =>
    root.render(
      <CoachChat
        user={user}
        revision={0}
        onRiskRefresh={vi.fn()}
        onSettings={vi.fn()}
        {...props}
      />
    )
  );
beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  conversations = [];
  messages = [];
  api.mockImplementation(async (path, options = {}) => {
    if (path === '/api/coach/conversations') return conversations;
    if (path === '/api/coach/chat') {
      conversations = [conversation];
      const next = {
        id: messages.length + 2,
        role: 'assistant',
        content: 'Coach not connected yet.',
        sources: [],
        created_at: '2026-11-24T08:00:01',
      };
      messages = [
        ...messages,
        {
          id: messages.length + 1,
          role: 'user',
          content: options.body.message,
          sources: null,
          created_at: '2026-11-24T08:00:00',
        },
        next,
      ];
      return {
        conversation_id: conversation.id,
        mode: 'placeholder',
        message: next,
      };
    }
    if (path === `/api/coach/conversations/${conversation.id}`) {
      if (options.method === 'DELETE') {
        conversations = [];
        messages = [];
        return;
      }
      return { ...conversation, messages };
    }
    throw new Error(`Unexpected request ${path}`);
  });
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  api.mockReset();
  vi.restoreAllMocks();
});
describe('saved backend coach preview', () => {
  it('starts with omitted ID, reconciles assistant-only reply into saved detail, and continues using server ID', async () => {
    const onRiskRefresh = vi.fn();
    await mount({ onRiskRefresh });
    expect(container.textContent).toContain('Coach preview');
    await typeMessage('  Help me read  ');
    await submit();
    const posts = () =>
      api.mock.calls.filter(([path]) => path === '/api/coach/chat');
    expect(posts()[0][1].body).toEqual({ message: 'Help me read' });
    expect(container.querySelectorAll('.coach-message-user')).toHaveLength(1);
    expect(container.querySelectorAll('.coach-message-assistant')).toHaveLength(
      1
    );
    expect(container.textContent).not.toContain('awaiting reconciliation');
    expect(onRiskRefresh).toHaveBeenCalledOnce();
    await typeMessage('What about tomorrow?');
    await submit();
    expect(posts()[1][1].body).toEqual({
      conversation_id: conversation.id,
      message: 'What about tomorrow?',
    });
    expect(container.querySelectorAll('.coach-message-user')).toHaveLength(2);
    expect(container.querySelectorAll('.coach-message-assistant')).toHaveLength(
      2
    );
  });
  it('reads and deletes saved chats while AI is off and blocks all new sends', async () => {
    conversations = [conversation];
    messages = initial;
    await mount({ user: { ...user, ai_enabled: false } });
    const select = container.querySelector('.coach-list button');
    await act(async () => select.click());
    expect(container.querySelectorAll('.coach-message')).toHaveLength(2);
    expect(container.querySelector('textarea').disabled).toBe(true);
    expect(button('Send message').disabled).toBe(true);
    await click('Delete conversation');
    expect(
      api.mock.calls.some(([, options]) => options?.method === 'DELETE')
    ).toBe(false);
    await click('Permanently delete conversation');
    expect(api).toHaveBeenCalledWith(
      `/api/coach/conversations/${conversation.id}`,
      expect.objectContaining({ method: 'DELETE' })
    );
    expect(container.textContent).toContain('No saved conversations yet');
    expect(api.mock.calls.some(([path]) => path === '/api/coach/chat')).toBe(
      false
    );
  });
  it('prevents duplicate in-flight POSTs and renders reply text/source titles safely', async () => {
    let finish;
    const original = api.getMockImplementation();
    api.mockImplementation((path, options) =>
      path === '/api/coach/chat'
        ? new Promise((resolve) => {
            finish = resolve;
          })
        : original(path, options)
    );
    await mount();
    await typeMessage('Help me read');
    await act(async () => {
      const form = container.querySelector('form');
      form.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true })
      );
      form.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true })
      );
    });
    expect(
      api.mock.calls.filter(([path]) => path === '/api/coach/chat')
    ).toHaveLength(1);
    expect(container.textContent).toContain('Waiting for the coach preview');
    const assistant = {
      ...initial[1],
      content: '<img src=x onerror=alert(1)>',
      sources: [{ id: 9, title: '<b>Paper title</b>' }],
    };
    conversations = [conversation];
    messages = [initial[0], assistant];
    await act(async () =>
      finish({
        conversation_id: conversation.id,
        mode: 'placeholder',
        message: assistant,
      })
    );
    expect(
      container.querySelector('.coach-message-assistant').textContent
    ).toContain('<img src=x');
    expect(container.querySelector('.coach-sources').textContent).toContain(
      '<b>Paper title</b>'
    );
    expect(container.querySelector('.coach-message img')).toBeNull();
    expect(container.querySelector('.coach-sources a')).toBeNull();
  });
  it('does not automatically retry a failed non-idempotent send and warns about uncertain outcomes', async () => {
    const original = api.getMockImplementation();
    api.mockImplementation((path, options) =>
      path === '/api/coach/chat'
        ? Promise.reject(new Error('Connection lost'))
        : original(path, options)
    );
    await mount();
    await typeMessage('Help me read');
    await submit();
    expect(
      api.mock.calls.filter(([path]) => path === '/api/coach/chat')
    ).toHaveLength(1);
    expect(container.textContent).toContain('may have been saved');
    expect(container.querySelector('textarea').value).toBe('Help me read');
    expect(container.querySelectorAll('.coach-message')).toHaveLength(0);
  });
  it('aborts an in-flight new message immediately when AI is disabled and resumes the composer after enabling', async () => {
    const original = api.getMockImplementation();
    let sentSignal;
    api.mockImplementation((path, options) =>
      path === '/api/coach/chat'
        ? new Promise((resolve, reject) => {
            sentSignal = options.signal;
            options.signal.addEventListener('abort', () =>
              reject(new DOMException('Cancelled', 'AbortError'))
            );
          })
        : original(path, options)
    );
    await mount();
    await typeMessage('Help me read');
    await act(async () =>
      container
        .querySelector('form')
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    );
    await mount({ user: { ...user, ai_enabled: false } });
    expect(sentSignal.aborted).toBe(true);
    expect(button('Send message').disabled).toBe(true);
    expect(container.textContent).toContain(
      'read and delete saved conversations'
    );
    await mount();
    expect(button('Send message').disabled).toBe(false);
    expect(
      api.mock.calls.filter(([path]) => path === '/api/coach/chat')
    ).toHaveLength(1);
  });
  it('retains a successful reply if reconciliation fails and requires reload instead of another send', async () => {
    const original = api.getMockImplementation();
    api.mockImplementation((path, options) =>
      path === `/api/coach/conversations/${conversation.id}`
        ? Promise.reject(new Error('Read failed'))
        : original(path, options)
    );
    await mount();
    await typeMessage('Help me read');
    await submit();
    expect(container.textContent).toContain('Your message was saved');
    expect(container.querySelectorAll('.coach-message-assistant')).toHaveLength(
      1
    );
    expect(button('Send message').disabled).toBe(true);
    api.mockImplementation(original);
    await click('Reload saved messages');
    expect(container.querySelectorAll('.coach-message-user')).toHaveLength(1);
    expect(container.querySelectorAll('.coach-message-assistant')).toHaveLength(
      1
    );
    expect(container.textContent).not.toContain('awaiting reconciliation');
  });
});
