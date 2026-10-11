# Wowhead MCP

Lets Claude read Wowhead for every World of Warcraft version: items, drops, quests, NPCs, spells, guides, news and patch notes. It is a read-only MCP server: connect to the hosted endpoint with no setup, or run it yourself. It needs no account, key or browser.

Unofficial and not affiliated with Wowhead or Blizzard.

## Tools

| Tool | Input | Returns |
|---|---|---|
| `search` | `query`, `edition` | Items, NPCs, quests and spells whose names match, with their Wowhead URLs |
| `get_page` | `url`, `offset` | A Wowhead page as text: tooltip, quick facts, map coordinates, quest text, drop sources with chances, vendors, abilities, guides and top comments. Long pages come in parts, each naming the `offset` of the next |
| `get_news` | `edition` | The 10 latest Wowhead news posts for that version |

## Editions

| `edition` | Wowhead path | Game version |
|---|---|---|
| `retail` | `/` | Retail, the default |
| `classic` | `/classic/` | Classic Era and Hardcore |
| `tbc` | `/tbc/` | Burning Crusade Classic and Anniversary |
| `wotlk` | `/wotlk/` | Wrath of the Lich King Classic |
| `cata` | `/cata/` | Cataclysm Classic |
| `mop-classic` | `/mop-classic/` | Mists of Pandaria Classic |
| `forever` | `/forever/` | WoW Forever |

`get_page` reads the version from the page itself and keeps only comments written for that version, so a Classic page never shows Retail comments.

A server locked to one edition drops the `edition` input and refuses pages of other versions, checked after redirects. Lock it with the edition paths of the hosted endpoint, or with `WOWHEAD_EDITION` when you run it yourself.

## Hosted endpoint

Connect any MCP client to one of these URLs over Streamable HTTP:

| URL | Serves |
|---|---|
| `https://wowhead-mcp.marco-vrinssen.workers.dev/mcp` | Every edition |
| `https://wowhead-mcp.marco-vrinssen.workers.dev/forever/mcp` | WoW Forever only. Every edition has its own path, like `/classic/mcp` |

- Claude Code: `claude mcp add --scope user --transport http wowhead https://wowhead-mcp.marco-vrinssen.workers.dev/mcp`
- Claude app and claude.ai: Settings, Connectors, Add custom connector, then paste a URL.
- Other agents and bots: point their MCP client at a URL.

It runs on free plans, so each IP gets 30 requests a minute, and it can be down for the rest of the day once the free daily quota is used up. For heavy use, run your own copy.

## Install

Requires Node 22 or later and git.

### Claude Code

```sh
claude mcp add --scope user wowhead -- npx -y github:studio-miyanko/wowhead-mcp#semver:^1
```

Locked to one version:

```sh
claude mcp add --scope user wowhead-classic --env WOWHEAD_EDITION=classic -- npx -y github:studio-miyanko/wowhead-mcp#semver:^1
```

### Claude desktop app

In Settings, Developer, Edit Config, add the server and restart the app:

```json
{
  "mcpServers": {
    "wowhead": { "command": "npx", "args": ["-y", "github:studio-miyanko/wowhead-mcp#semver:^1"] }
  }
}
```

### Your own Worker

`src/worker.js` serves the same tools on Cloudflare Workers, at `/mcp` and the edition paths, with a per-IP rate limit. Change `name` in `wrangler.jsonc` first, so the Worker gets its own URL:

```sh
npm install
npx wrangler deploy
```

### Your own code

Import `createServer` from `wowhead-mcp/src/server.js`, optionally with `{ edition: 'forever' }`, and connect it to any MCP transport.

## How it behaves

- Follows Wowhead's robots.txt. Names are looked up in database listings like `/forever/quests/name:library`, because `/search` is disallowed for bots.
- Names this repo in its User-Agent, and caches answers for an hour.
- Fetches nothing outside Wowhead.

## Limits

- Lookups match names in English.
- Wowhead's page layout can change. The live tests catch that, and the parser then needs an update.
- For personal, non-commercial use. The data belongs to Wowhead, and its terms apply.

## Develop

```sh
npm install
npm test
```

The tests read Wowhead live. Try the server in the MCP Inspector with `npx @modelcontextprotocol/inspector node src/index.js`.

World of Warcraft is a trademark of Blizzard Entertainment.
