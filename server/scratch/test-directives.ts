import { createDb } from "@paperclipai/db";
import { directiveService } from "../src/services/directives.ts";

async function main() {
  try {
    const embeddedConnectionString = "postgres://paperclip:paperclip@127.0.0.1:54329/paperclip";
    // Or let's fetch health to get the port or query active DB
    const health = await fetch("http://localhost:3100/api/health").then(r => r.json());
    console.log("Health:", health.status);

    // Let's call the API directly and print full response
    const res = await fetch("http://localhost:3100/api/companies/e97dd876-ab97-46c9-a49d-286aa3e1fde3/directives");
    console.log("Status:", res.status);
    const body = await res.text();
    console.log("Body:", body);
  } catch (err) {
    console.error("Test error:", err);
  }
}

main();
