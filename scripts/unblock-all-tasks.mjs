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
  console.log('=== UNBLOCKING ALL TASKS IN PAPERCLIP ===');
  const issues = await request(`/api/companies/${COMPANY_ID}/issues`);
  console.log(`Found ${issues?.length ?? 0} total issues.`);

  let unblockedCount = 0;
  for (const issue of issues || []) {
    if (issue.status === 'blocked') {
      try {
        await request(`/api/issues/${issue.id}`, {
          method: 'PATCH',
          body: {
            status: 'todo'
          }
        });
        unblockedCount++;
        console.log(`Unblocked issue: ${issue.identifier || issue.id} (${issue.title})`);
      } catch (err) {
        console.warn(`Failed to unblock ${issue.id}:`, err.message);
      }
    }
  }

  console.log(`Successfully unblocked ${unblockedCount} issues to 'todo'.`);
}

main().catch(err => {
  console.error('Error unblocking issues:', err);
  process.exit(1);
});
