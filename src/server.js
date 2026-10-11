import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';

import pkg from '../package.json' with { type: 'json' };
import { EDITIONS, editionUrl, getNews, getWowheadPage, lookup, pagePart } from './wowhead.js';

const CACHE_MS = 60 * 60 * 1000;
const CACHE_SIZE = 300;
const cache = new Map();

const hints = { readOnlyHint: true, openWorldHint: true };

// Wowhead has no paid API, so repeated lookups are answered from memory to keep traffic low.
async function cached(key, load) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.time < CACHE_MS) return hit.value;
  const value = await load();
  cache.delete(key);
  cache.set(key, { time: Date.now(), value });
  if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value);
  return value;
}

function text(value) {
  return { content: [{ type: 'text', text: value }] };
}

// A host that serves one game version passes `edition`, which drops the edition input from every tool
// and refuses pages of other versions, so its answers never mix in another version's data.
export function createServer({ edition: only } = {}) {
  if (only && !EDITIONS[only]) {
    throw new Error(`Unknown Wowhead edition "${only}". Use one of: ${Object.keys(EDITIONS).join(', ')}.`);
  }
  const server = new McpServer({ name: 'wowhead-mcp', version: pkg.version });
  const scope = only ? `WoW ${EDITIONS[only].label}` : 'World of Warcraft';
  const editionInput = only ? {} : {
    edition: z.enum(Object.keys(EDITIONS)).default('retail')
      .describe('Game version: retail, classic (Era, Hardcore), tbc (Anniversary), wotlk, cata, mop-classic or forever'),
  };

  async function search({ query, edition = only }) {
    const rows = await lookup(query, edition);
    return rows || `Nothing in ${EDITIONS[edition].label} named like "${query}". Try an English name, fewer words, get_news, `
      + `or the guide hub ${editionUrl(edition)}/guides with get_page.`;
  }

  server.registerTool('search', {
    title: 'Search Wowhead',
    description: `Find ${scope} items, NPCs, quests and spells by name in Wowhead's database. Returns Wowhead URLs to open with get_page.`,
    inputSchema: z.object({ query: z.string().min(1).max(100).describe('Name or part of it, in English'), ...editionInput }),
    annotations: hints,
  }, async (input) => text(await cached(`search:${input.edition ?? only}:${input.query.toLowerCase()}`, () => search(input))));

  server.registerTool('get_page', {
    title: 'Read a Wowhead page',
    description: `Read a ${scope} page on Wowhead as text: tooltip, quick facts, map coordinates, quest text, drop sources with chances, `
      + `vendors, rewards, abilities, guides and top comments written for that game version. The guide hub ${editionUrl(only ?? 'retail')}/guides lists the guides. `
      + (only ? `Pages of other versions are refused. ` : 'The URL path picks the version, like /classic/ or /forever/. ')
      + 'Long pages, like patch notes, come in parts that end with the offset of the next part.',
    inputSchema: z.object({
      url: z.string().min(1).max(300).describe(`Wowhead URL from search results or the user, like ${editionUrl(only ?? 'retail')}/item=19019`),
      offset: z.number().int().min(0).default(0).describe('Where to continue a long page, from the end of the previous part'),
    }),
    annotations: hints,
  }, async ({ url, offset }) => text(pagePart(await cached(`page:${url}`, () => getWowheadPage(url, only)), offset)));

  server.registerTool('get_news', {
    title: 'Latest Wowhead news',
    description: `The 10 latest ${scope} news posts on Wowhead, newest first, with dates, URLs and summaries: `
      + 'patches, hotfixes, beta and PTR builds and class changes.',
    inputSchema: z.object(editionInput),
    annotations: hints,
  }, async ({ edition = only }) => text(await cached(`news:${edition}`, () => getNews(edition))));

  return server;
}
