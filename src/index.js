#!/usr/bin/env node
import { serveStdio } from '@modelcontextprotocol/server/stdio';

import { createServer } from './server.js';

// WOWHEAD_EDITION, like forever, locks the server to one game version.
const edition = process.env.WOWHEAD_EDITION || undefined;

// Built once up front, so an unknown edition fails at start instead of on the first connection.
createServer({ edition });
serveStdio(() => createServer({ edition }));
