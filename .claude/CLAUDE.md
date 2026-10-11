# wowhead-mcp

## Rules

- A standalone MCP server for every Wowhead edition. Split out of wow-forever-search on 2026-10-11, which now runs it with `WOWHEAD_EDITION=forever`. The Discord bot wow-forever-bot imports `createServer({ edition: 'forever' })`.
- MCP users and the bot follow `#semver:^1`. The wow-forever-search plugin pins an exact tag. A breaking tool change needs a major version.
- `EDITIONS` in `src/wowhead.js` holds each version's URL path, page label (`"dataTree":"Forever"`), comment `dataTree` id and news feed. The ids come from `WH.dataEnv` in Wowhead's `tooltips.js`: 1 Retail, 4 Classic, 5 TBC, 8 Wrath, 11 Cata, 15 Mists, 16 Forever. Wowhead has news feeds only for retail, classic and forever.
- A locked server refuses pages whose label is another edition, checked after redirects. An unlocked one refuses pages without a known label.
- Personal, non-commercial use only. Wowhead's EULA forbids commercial use without written permission (checked 2026-10-09).
- Keep tool output plain text. `get_page` returns long pages in parts of `PAGE_CHARS` through `pagePart`.

## Wowhead

- Never fake a browser or route around a block. Identify with the User-Agent in `src/http.js`.
- Wowhead's robots.txt disallows `/search`, `/list`, `/account` and `/random` for bots. Names are looked up in database listings like `/forever/quests/name:library`, and a test fails if a lookup requests a disallowed path.
- `curl` gets a CloudFront 403 from www.wowhead.com, while Node's `fetch` gets through. Probe pages with `node -e`.
- The parser depends on these page markers: `g_pageInfo`, `WH.Gatherer.addData`, `WH.markup.printHtml`, `new Listview`, `lv_comments0`, `g_mapperData`, the page label `"dataTree":"<name>"` and the main column `<div class="text">`. Page data is JSON with some JavaScript fields, which `parseJson` in `src/embedded.js` handles.

## Checks

- `npm test` after every change to `src/`. It reads Wowhead live.

## Release

1. Bump `version` in `package.json` and `package-lock.json`.
2. Run `npm test`.
3. Add the changes to `CHANGELOG.md`.
4. Push, tag `vX.Y.Z` and create a GitHub release.
5. Point the tag in wow-forever-search's `.mcp.json` at it when the plugin should pick it up.
