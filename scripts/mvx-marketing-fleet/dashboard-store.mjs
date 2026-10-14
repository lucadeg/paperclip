import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {envelopeDashboard,verifyDashboardEnvelope} from './dashboard-model.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const DASHBOARDS_ROOT=path.join(root,'evidence','mvx-marketing-fleet','dashboards');
const safe=x=>typeof x==='string'&&/^[a-z0-9_-]{3,80}$/i.test(x);
export function dashboardStorePath(snapshot,{base=DASHBOARDS_ROOT}={}){
 if(!safe(snapshot.companyId)||!safe(snapshot.tenantId)||!safe(snapshot.clientId)||
   !Number.isFinite(Date.parse(snapshot.generatedAt)))throw Error('Invalid tenant/client scope');
 const utc=new Date(snapshot.generatedAt).toISOString().replace(/[:.]/g,'-');
 const output=path.resolve(base,snapshot.companyId,snapshot.clientId,utc,'snapshot.json');
 if(!output.startsWith(path.resolve(root,'evidence')+path.sep))throw Error('Evidence store must remain in .hermes repo');
 return output;
}
export async function storeDashboardSnapshot(snapshot){
 const filename=dashboardStorePath(snapshot),payload=envelopeDashboard(snapshot);
 if(!verifyDashboardEnvelope(payload,snapshot.companyId))throw Error('Invalid dashboard digest');
 await fs.mkdir(path.dirname(filename),{recursive:true});
 // Separate unique run file: direct write is safe because this snapshot is versioned;
 // persistent API should ignore partially written/invalid JSON and fail closed.
 const data=JSON.stringify(payload,null,2)+'\n';
 if(Buffer.byteLength(data)>3000000)throw Error('Snapshot size limit exceeded');
 await fs.writeFile(filename,data,{flag:'wx'});
 return {filename,bytes:Buffer.byteLength(data),sha256:payload.payloadSha256};
}
