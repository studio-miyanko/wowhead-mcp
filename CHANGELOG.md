# Changelog

## 1.0.0 (2026-10-11)

- First release, split out of wow-forever-search 1.1.0 so other hosts and plugins can use it.
- Reads every Wowhead edition: Retail, Classic, TBC, Wrath, Cata, Mists Classic and WoW Forever. `get_page` keeps only comments written for the page's own version.
- `WOWHEAD_EDITION`, or `createServer({ edition })`, locks the server to one version and refuses pages of others.
