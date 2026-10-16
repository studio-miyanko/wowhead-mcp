import { createMcpHandler } from '@modelcontextprotocol/server';

import { createServer } from './server.js';
import { EDITIONS } from './wowhead.js';

// /mcp serves every edition, and /<edition>/mcp locks the tools to one version, like /forever/mcp.
const handlers = new Map([
  ['/mcp', createMcpHandler(() => createServer())],
  ...Object.keys(EDITIONS).map((edition) => [`/${edition}/mcp`, createMcpHandler(() => createServer({ edition }))]),
]);

const INFO = 'wowhead-mcp: connect an MCP client to /mcp, or to /forever/mcp and the other edition paths. '
  + 'Setup and source: https://github.com/studio-miyanko/wowhead-mcp';

// Browser-based MCP clients, like the MCP Inspector, need CORS to reach the endpoint.
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
  'access-control-allow-headers': 'content-type, accept, authorization, mcp-session-id, mcp-protocol-version, last-event-id',
  'access-control-expose-headers': 'mcp-session-id, mcp-protocol-version',
};

function withCors(response) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(CORS)) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

// The hosted endpoint lets agents and bots connect without Node or an install.
export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const handler = handlers.get(pathname);
    if (!handler) return new Response(INFO, { status: pathname === '/' ? 200 : 404 });

    // Internet callers share the account's free Worker requests and Wowhead's goodwill, so each IP gets a fair share.
    // Calls through a service binding come from the owner's own Workers and carry no client IP, so they skip the limit.
    const ip = request.headers.get('cf-connecting-ip');
    if (ip) {
      const { success } = await env.LIMITER.limit({ key: ip });
      if (!success) return withCors(new Response('Too many requests. Try again in a minute.', { status: 429, headers: { 'retry-after': '60' } }));
    }
    return withCors(await handler.fetch(request));
  },
};
