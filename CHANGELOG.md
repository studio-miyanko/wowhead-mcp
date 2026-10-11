# Changelog

## 1.1.0 (2026-10-11)

- Hosted endpoint at `https://wowhead-mcp.marco-vrinssen.workers.dev/mcp` for every edition and `/<edition>/mcp` for one, like `/forever/mcp`, so agents and bots connect over Streamable HTTP without Node. 30 requests a minute per IP.
- `src/worker.js` serves the same tools on Cloudflare Workers, for anyone who wants their own copy.

## 1.0.0 (2026-10-11)

- First release, split out of wow-forever-search 1.1.0 so other hosts and plugins can use it.
- Reads every Wowhead edition: Retail, Classic, TBC, Wrath, Cata, Mists Classic and WoW Forever. `get_page` keeps only comments written for the page's own version.
- `WOWHEAD_EDITION`, or `createServer({ edition })`, locks the server to one version and refuses pages of others.
