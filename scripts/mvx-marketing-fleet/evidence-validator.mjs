import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {envelopeDashboard} from './dashboard-model.mjs';
const sha=v=>createHash('sha256').update(v).digest('hex');
const fileNameOk=n=>typeof n==='string'&&/^[a-z0-9_.-]{1,100}$/i.test(n)&&n!=='.'&&n!=='..';
export async function verifyEvidenceManifest(directory,{expectedCompanyId,expectedTenantId,expectedClientId}={}){
 const failures=[],passed=[];
 let manifest;
 try{
   const stat=await fs.lstat(directory);
   if(!stat.isDirectory()||stat.isSymbolicLink())throw Error('unsafe manifest root');
   const manifestPath=path.join(directory,'manifest.json');
   if((await fs.lstat(manifestPath)).isSymbolicLink())throw Error('manifest symlink');
   manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));
 } catch{return {status:'BLOCKED',failures:['Missing/invalid manifest root'],passed:[]};}
 if(!['mvx-competitor-audit-files/v1','mvx-workflow-files/v1'].includes(manifest.schema))
   failures.push('Unexpected manifest schema');
 for(const [key,expect] of [['companyId',expectedCompanyId],['tenantId',expectedTenantId],
   ['clientId',expectedClientId]]){
   if(expect!==undefined&&manifest[key]!==expect)failures.push('Scope mismatch '+key);
 }
 const entries=manifest.inventory||manifest.files;
 if(!Array.isArray(entries)||entries.length<2||entries.length>50)failures.push('Invalid inventory');
 else{
   const names=new Set();
   for(const e of entries){
     if(!fileNameOk(e.name)||names.has(e.name)||!Number.isSafeInteger(e.size??e.bytes)||
        !/^[a-f0-9]{64}$/.test(e.sha256||'')){
       failures.push('Malformed or duplicate inventory entry');continue;
     }
     names.add(e.name);
     const filename=path.join(directory,e.name);
     try{
       const stat=await fs.lstat(filename);
       if(!stat.isFile()||stat.isSymbolicLink()||stat.size>(4*1024*1024))throw Error('unsafe file');
       const bytes=await fs.readFile(filename);
       if(bytes.byteLength!==(e.size??e.bytes)||sha(bytes)!==e.sha256)
         throw Error('content hash/size mismatch');
       passed.push({name:e.name,sha256:e.sha256});
     }catch{failures.push('Invalid, missing, symlink or tampered file '+e.name);}
   }
 }
 return {schema:'mvx-evidence-verification/v1',status:failures.length?'BLOCKED':'VERIFIED_LOCAL_INTEGRITY',
   authority:'LOCAL_FILE_HASH_ONLY_NOT_PROVIDER_SIGNATURE',
   expectedCompanyId,expectedClientId,passed,failures};
}
export async function verifyDashboardFile(filename,{expectedCompanyId,expectedTenantId,expectedClientId}={}){
 try{
   const stat=await fs.lstat(filename);
   if(!stat.isFile()||stat.isSymbolicLink()||stat.size>3_000_000)throw Error('unsafe snapshot');
   const envelope=JSON.parse(await fs.readFile(filename,'utf8'));
   if(envelope?.schema!=='mvx-marketing-dashboard-envelope/v1'||
     envelope.payloadSha256!==sha(JSON.stringify(envelope.snapshot))||
     envelope.snapshot?.companyId!==expectedCompanyId||
     envelope.snapshot?.tenantId!==expectedTenantId||
     envelope.snapshot?.clientId!==expectedClientId)
      throw Error('scope/digest mismatch');
   return {status:'VERIFIED_LOCAL_INTEGRITY',sha256:envelope.payloadSha256,
     clientId:envelope.snapshot.clientId,companyId:envelope.snapshot.companyId};
 }catch{return {status:'BLOCKED',reason:'Invalid scope, snapshot or digest'};}
}
