import http from 'node:http';

const COMPANY_ID = 'e97dd876-ab97-46c9-a49d-286aa3e1fde3';
const BASE_URL = 'http://127.0.0.1:3100';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const method = options.method || 'GET';
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const body = options.body ? JSON.stringify(options.body) : undefined;

  const res = await fetch(url, { method, headers, body });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`${method} ${path} failed (${res.status}): ${txt}`);
  }
  return res.json().catch(() => null);
}

async function main() {
  console.log('Fetching agents for company:', COMPANY_ID);
  const agents = await request(`/api/companies/${COMPANY_ID}/agents`);
  console.log(`Found ${agents?.length ?? 0} agents.`);

  let updatedCount = 0;
  for (const agent of agents || []) {
    const currentConfig = agent.runtimeConfig || {};
    const newConfig = {
      ...currentConfig,
      heartbeat: {
        ...(currentConfig.heartbeat || {}),
        enabled: false, // DISABLE background heartbeat ticker
        intervalSec: 300
      }
    };

    try {
      await request(`/api/agents/${agent.id}`, {
        method: 'PATCH',
        body: {
          status: 'idle',
          runtimeConfig: newConfig
        }
      });
      updatedCount++;
    } catch (err) {
      console.warn(`Failed to update agent ${agent.name} (${agent.id}):`, err.message);
    }
  }

  console.log(`Successfully updated ${updatedCount}/${agents?.length ?? 0} agents to IDLE with heartbeats disabled.`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
