import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { test } from 'node:test';

import { htmlToText, markupToText } from '../src/text.js';
import { createServer } from '../src/server.js';
import { getNews, getWowheadPage, lookup, pagePart } from '../src/wowhead.js';

// The live checks read every source, so they fail when a layout or API the parsers rely on changes.

test('lookup finds WoW Forever items, quests and spells by name in the database listings', async () => {
  const text = await lookup('thunderfury', 'forever');
  assert.match(text, /- Thunderfury, Blessed Blade of the Windseeker \(item\) https:\/\/www\.wowhead\.com\/forever\/item=19019/);
  assert.match(text, /- Rise, Thunderfury! \(quest\) https:\/\/www\.wowhead\.com\/forever\/quest=7787/);
  assert.match(await lookup('shifting power', 'forever'), /- Shifting Power \(spell\) https:\/\/www\.wowhead\.com\/forever\/spell=\d+/);
});

test('lookups never request paths Wowhead disallows for bots', async () => {
  const urls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (url, init) => {
    urls.push(String(url));
    return realFetch(url, init);
  };
  try {
    await lookup('onyxia', 'forever');
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.ok(urls.length > 0);
  for (const url of urls) assert.doesNotMatch(url, /wowhead\.com\/(?:[a-z-]+\/)?(?:search|list|account|random)\b/);
});

test('item page has tooltip and drop sources with chances', async () => {
  const text = await getWowheadPage('https://www.wowhead.com/forever/item=18563');
  assert.match(text, /## Tooltip\nBindings of the Windseeker\nItem Level 70/);
  assert.match(text, /- Baron Geddon \(npc=12056\): [\d.]+% chance, Molten Core/);
});

test('comments come only from WoW Forever, never from older versions', async () => {
  const old = await getWowheadPage('forever/item=19019');
  assert.doesNotMatch(old, /## Top comments\n[\s\S]*\((?:[+-]?\d+), (?:2005|2006|2007|2019|2020)-/);
  const forever = await getWowheadPage('forever/item=8345');
  assert.match(forever, /## Top comments\n- \([+-]?\d+, 2026-\d{2}-\d{2}\) .*Shifting Power/);
});

test('a server locked to one version refuses pages of other versions, also behind a redirect', async () => {
  await assert.rejects(getWowheadPage('https://www.wowhead.com/item=19019', 'forever'), /is not a WoW Forever page/);
  await assert.rejects(getWowheadPage('classic/item=19019', 'forever'), /is not a WoW Forever page/);
  await assert.rejects(getWowheadPage('forever/guide=7671', 'forever'), /classic\/guide\/.+ is not a WoW Forever page/);
});

test('every version reads on its own path, with tooltips and lookups of that version', async () => {
  assert.match(await lookup('thunderfury', 'retail'), /\(item\) https:\/\/www\.wowhead\.com\/item=19019/);
  assert.match(await lookup('thunderfury', 'classic'), /\(item\) https:\/\/www\.wowhead\.com\/classic\/item=19019/);
  const retail = await getWowheadPage('https://www.wowhead.com/item=19019');
  assert.match(retail, /## Tooltip\nThunderfury, Blessed Blade of the Windseeker\nItem Level 40/);
  const mists = await getWowheadPage('mop-classic/item=19019');
  assert.match(mists, /^# .+\nhttps:\/\/www\.wowhead\.com\/mop-classic\/item=19019/);
  assert.match(mists, /## Tooltip\nThunderfury, Blessed Blade of the Windseeker\n/);
});

test('agents get the lookup rules when they connect, with the version lock in them', async () => {
  const child = spawn(process.execPath, ['src/index.js'], { env: { ...process.env, WOWHEAD_EDITION: 'forever' }, stdio: ['pipe', 'pipe', 'inherit'] });
  try {
    const reply = new Promise((done) => {
      let buffer = '';
      child.stdout.on('data', (chunk) => {
        buffer += chunk;
        if (buffer.includes('\n')) done(JSON.parse(buffer.slice(0, buffer.indexOf('\n'))));
      });
    });
    const params = { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } };
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params })}\n`);
    const { result } = await reply;
    assert.match(result.instructions, /never from memory/);
    assert.match(result.instructions, /call get_page again with that offset/);
    assert.match(result.instructions, /Only WoW Forever pages open\. For a link to another version, open the same path under https:\/\/www\.wowhead\.com\/forever\//);
  } finally {
    child.kill();
  }
});

test('an unknown edition fails when the server is built', () => {
  assert.throws(() => createServer({ edition: 'vanilla' }), /Unknown Wowhead edition "vanilla"/);
  assert.ok(createServer({ edition: 'forever' }));
});

test('quest page has the quest text', async () => {
  const text = await getWowheadPage('forever/quest=7787');
  assert.match(text, /## Description\nYou have defeated the Wind Seeker/);
});

test('npc page has map coordinates and abilities', async () => {
  const npc = await getWowheadPage('forever/npc=14347');
  assert.match(npc, /## Locations\n- Silithus: \d+\.?\d*, \d+\.?\d*/);
  const boss = await getWowheadPage('forever/npc=12056');
  assert.match(boss, /## abilities \(\d+\)\n[\s\S]*Living Bomb \(spell=20475\)/);
});

test('guide page has the guide body', async () => {
  const text = await getWowheadPage('forever/guide=35009');
  assert.match(text, /## Article\n[\s\S]*Holy/);
});

test('news lists recent WoW Forever posts, and their links pass as Forever pages', async () => {
  const text = await getNews('forever');
  assert.match(text, /^- \d{4}-\d{2}-\d{2} .+\n {2}https:\/\/www\.wowhead\.com\/news=\d+/);
  const link = text.match(/https:\/\/www\.wowhead\.com\/news=\d+/)[0];
  assert.match(await getWowheadPage(link, 'forever'), /^# .+\nhttps:\/\/www\.wowhead\.com\/forever\/news\//);
  assert.match(await getNews('retail'), /^- \d{4}-\d{2}-\d{2} .+\n {2}https:\/\/www\.wowhead\.com\/news=\d+/);
});

test('Wowhead pages refuse other hosts', async () => {
  await assert.rejects(getWowheadPage('https://example.com/item=1'), /Not a Wowhead URL/);
  await assert.rejects(getWowheadPage('//example.com/item=1'), /Not a Wowhead URL/);
});

test('markup becomes text with entity names and coins', () => {
  const names = new Map([['item', 'x'], ['item=19019', 'Thunderfury']]);
  const markup = '[b]Get[/b] [item=19019] and [quest=7787] for [money=123456].[ul][li]One[/li][/ul][tooltip name=x]hidden[/tooltip][Bracketed]';
  assert.equal(markupToText(markup, names), 'Get Thunderfury and quest 7787 for 12g 34s 56c.\n- One\n[Bracketed]');
});

test('patch notes keep old and new values and section names', () => {
  const markup = '[toggler name="Hunter" size=3]Bite for [del copy=true]5[/del][ins]10[/ins] sec[ins] at once[/ins].[del]Old line[/del]';
  assert.equal(markupToText(markup), '## Hunter\nBite for 10 (was 5) sec(new: at once).(removed: Old line)');
});

test('long pages come in parts that end at a line break and name the next offset', () => {
  const page = `${'a'.repeat(9000)}\n${'b'.repeat(9000)}`;
  assert.match(pagePart(page), /^a{9000}\n\n\[Part ends at 9000 of 18001 characters\. Call get_page with offset 9000/);
  assert.equal(pagePart(page, 9000), `\n${'b'.repeat(9000)}`);
  assert.match(pagePart(page, 20000), /^Nothing at offset 20000/);
});

test('tooltip html becomes lines with coin units', () => {
  const html = '<table><tr><td><b>Sword</b><br>Unique<div class="x">Classes: Rogue</div>Sell Price: <span class="moneygold">2</span> <span class="moneysilver">5</span></td></tr></table>';
  assert.equal(htmlToText(html), 'Sword\nUnique\nClasses: Rogue\nSell Price: 2g 5s');
});
