# Wowhead MCP

Lets AI agents read Wowhead for every World of Warcraft version: items, drops, quests, NPCs, spells, guides, news and patch notes. It is a read-only MCP server that runs on your own computer and needs no account, key or browser.

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

A server locked to one edition drops the `edition` input and refuses pages of other versions, checked after redirects. Lock it with `WOWHEAD_EDITION`, like `forever`.

## Install

Requires Node 22 or later and git. Your agent starts the server itself, so nothing needs to keep running.

### Claude Code

```sh
claude mcp add --scope user wowhead -- npx -y github:studio-miyanko/wowhead-mcp#semver:^1
```

Locked to one version, like WoW Forever:

```sh
claude mcp add --scope user wowhead --env WOWHEAD_EDITION=forever -- npx -y github:studio-miyanko/wowhead-mcp#semver:^1
```

### Claude desktop app

In Settings, Developer, Edit Config, add the server and restart the app. Leave out `env` to read every version:

```json
{
  "mcpServers": {
    "wowhead": {
      "command": "npx",
      "args": ["-y", "github:studio-miyanko/wowhead-mcp#semver:^1"],
      "env": { "WOWHEAD_EDITION": "forever" }
    }
  }
}
```

### Other agents

Cursor, VS Code, Codex and other MCP clients run the same command as a stdio server: `npx -y github:studio-miyanko/wowhead-mcp#semver:^1`, with `WOWHEAD_EDITION` in its environment to lock a version.

### Your own Worker

`src/worker.js` serves the same tools on Cloudflare Workers at `/mcp`, and locked to one edition at paths like `/forever/mcp`. Callers from the internet get 30 requests a minute per IP. Your other Workers can call it through a service binding, which skips that limit.

This repo's Worker is private and only serves its owner's Discord bot. For a public copy of your own, change `name` and set `workers_dev` to `true` in `wrangler.jsonc`, then deploy:

```sh
npm install
npx wrangler deploy
```

A public copy also works in claude.ai and the Claude apps: Settings, Connectors, Add custom connector, then paste its URL. Every request counts against your Cloudflare account's free daily requests.

### Your own code

Import `createServer` from `wowhead-mcp/src/server.js`, optionally with `{ edition: 'forever' }`, and connect it to any MCP transport.

## How it behaves

- Tells agents how to use it when they connect: look facts up instead of answering from memory, read long pages to the end and read the change markers in patch notes.
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
