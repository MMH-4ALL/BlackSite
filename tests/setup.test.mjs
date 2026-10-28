import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';

test('explicit squad presets override balanced fill and persist the requested teams', async () => {
  const dom = new JSDOM(await readFile(new URL('../index.html', import.meta.url), 'utf8'), { url: 'https://example.test/BlackSite/' });
  const saved = new Map();
  for (const name of ['window', 'document', 'localStorage', 'location', 'CustomEvent']) {
    saved.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
  }
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('No network in UI tests'); };
  try {
    await import('../ui.js');
    const doc = dom.window.document;
    for (const [preset, allies, enemies] of [['0,5', '0', '5'], ['2,5', '2', '5'], ['4,5', '4', '5'], ['7,8', '7', '8']]) {
      const fill = doc.getElementById('botFill');
      fill.value = 'balanced';
      fill.dispatchEvent(new dom.window.Event('input'));
      doc.querySelector(`[data-squad="${preset}"]`).click();
      assert.equal(fill.value, 'manual');
      assert.equal(doc.getElementById('allyCount').value, allies);
      assert.equal(doc.getElementById('botCount').value, enemies);
      assert.equal(doc.getElementById('botCount').disabled, false);
      assert.equal(JSON.parse(dom.window.localStorage.getItem('blacksite.settings.v1')).botCount, Number(enemies));
    }
  } finally {
    globalThis.fetch = originalFetch;
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
    dom.window.close();
  }
});
