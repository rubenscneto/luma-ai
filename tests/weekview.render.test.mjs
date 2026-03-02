import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/components/agenda/WeekView.tsx', import.meta.url), 'utf8');

test('desktop timeline layout snapshot markers', () => {
  assert.match(source, /data-testid="desktop-week-grid"/);
  assert.match(source, /hidden md:flex bg-surface dark:bg-zinc-950/);
  assert.match(source, /min-w-\[96px\] lg:min-w-\[120px\]/);
});

test('mobile compact fallback snapshot markers', () => {
  assert.match(source, /data-testid="mobile-week-list"/);
  assert.match(source, /md:hidden divide-y divide-card-border\/50/);
  assert.match(source, /Nenhum bloco para este dia\./);
});

test('jsx malformed div tags were fixed', () => {
  assert.equal(source.includes('< div'), false);
  assert.equal(source.includes('</div >'), false);
});
