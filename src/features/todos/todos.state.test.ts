import { createStore } from 'jotai';
import { describe, expect, it, vi } from 'vitest';
import { newTodoPriorityAtom } from './todos.state';

const STORAGE_KEY = 'todos:priority';

// `atomWithStorage` reads storage once, when the module is evaluated, so a test about what the
// first render sees needs a fresh module rather than a fresh store.
async function freshAtom(): Promise<typeof newTodoPriorityAtom> {
  vi.resetModules();
  const { newTodoPriorityAtom: priorityAtom } = await import('./todos.state');
  return priorityAtom;
}

function dispatchStorage(newValue: string): void {
  window.dispatchEvent(
    new StorageEvent('storage', { key: STORAGE_KEY, newValue, storageArea: localStorage }),
  );
}

// The filter and the search term used to live here too. They are search params now, so what is
// left is the one piece of state that belongs to this browser rather than to the address bar.
describe('newTodoPriorityAtom', () => {
  // Each case seeds the atom: its initial value is read from localStorage.
  function freshStore() {
    const store = createStore();
    store.set(newTodoPriorityAtom, 'normal');
    return store;
  }

  it('starts on normal', () => {
    expect(freshStore().get(newTodoPriorityAtom)).toBe('normal');
  });

  it('persists what was picked', () => {
    const store = freshStore();

    store.set(newTodoPriorityAtom, 'high');

    expect(store.get(newTodoPriorityAtom)).toBe('high');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('"high"');
  });

  it('keeps stores independent', () => {
    const a = freshStore();
    const b = freshStore();

    a.set(newTodoPriorityAtom, 'low');

    expect(a.get(newTodoPriorityAtom)).toBe('low');
    expect(b.get(newTodoPriorityAtom)).toBe('normal');
  });

  it('loads a valid persisted priority on the first read', async () => {
    localStorage.setItem(STORAGE_KEY, '"high"');

    expect(createStore().get(await freshAtom())).toBe('high');
  });

  // Another version of this app, another tab or a hand-edited value can leave anything under the
  // key. The fallback is a default, not a cleanup: the string stays until a valid pick replaces it.
  it('falls back to normal on an invalid persisted priority without deleting it', async () => {
    localStorage.setItem(STORAGE_KEY, '"urgent"');
    const priorityAtom = await freshAtom();
    const store = createStore();

    expect(store.get(priorityAtom)).toBe('normal');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('"urgent"');

    store.set(priorityAtom, 'low');

    expect(localStorage.getItem(STORAGE_KEY)).toBe('"low"');
  });

  it('ignores an invalid cross-tab write and still takes a valid one', () => {
    localStorage.setItem(STORAGE_KEY, '"high"');
    const store = createStore();
    // Subscribing mounts the atom, which is what installs the storage-event listener.
    const unsubscribe = store.sub(newTodoPriorityAtom, () => {});

    dispatchStorage('"urgent"');
    expect(store.get(newTodoPriorityAtom)).toBe('high');

    dispatchStorage('"low"');
    expect(store.get(newTodoPriorityAtom)).toBe('low');

    unsubscribe();
  });
});
