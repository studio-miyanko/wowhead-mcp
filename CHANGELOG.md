# Changelog

## 1.2.0 (2026-10-16)

- Agents get the lookup rules when they connect: answer from the tools instead of memory, search official names, read long pages to the end and read the change markers in patch notes. No plugin or skill is needed for them.
- The hosted endpoint is closed, so nobody shares one free quota. Run the server from GitHub, or deploy a Worker of your own.
- Calls from your own Workers through a service binding skip the per-IP limit.

## 1.1.0 (2026-10-11)

- Hosted endpoint at `https://wowhead-mcp.marco-vrinssen.workers.dev/mcp` for every edition and `/<edition>/mcp` for one, like `/forever/mcp`, so agents and bots connect over Streamable HTTP without Node. 30 requests a minute per IP.
- `src/worker.js` serves the same tools on Cloudflare Workers, for anyone who wants their own copy.

## 1.0.0 (2026-10-11)

- First release, split out of wow-forever-search 1.1.0 so other hosts and plugins can use it.
- Reads every Wowhead edition: Retail, Classic, TBC, Wrath, Cata, Mists Classic and WoW Forever. `get_page` keeps only comments written for the page's own version.
- `WOWHEAD_EDITION`, or `createServer({ edition })`, locks the server to one version and refuses pages of others.
