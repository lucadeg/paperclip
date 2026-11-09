'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const PORT = 3114;
const origin = 'http://127.0.0.1:' + PORT;
const serverFile = path.resolve(__dirname, '../serve-real-ui.cjs');
let server;
async function request(pathname, method = 'GET') {
  return new Promise((resolve,reject) => {
    const req = http.request({hostname:'127.0.0.1',port:PORT,path:pathname,method}, res => {
      let body = '';res.setEncoding('utf8');
      res.on('data', chunk => {body += chunk; if(body.length > 120000)req.destroy()});
      res.on('end', () => resolve({status:res.statusCode,headers:res.headers,body}));
    });req.on('error',reject);req.end();
  });
}
async function start() {
  server = spawn(process.execPath,[serverFile],{
    cwd:path.dirname(serverFile),
    env:{...process.env,PAPERCLIP_UI_PORT:String(PORT)},
    stdio:['ignore','pipe','pipe'],windowsHide:true
  });
  server.stderr.on('data',chunk=>{process.stderr.write(String(chunk))});
  for(let i=0;i<40;i++) {
    try{const status=await request('/api/status');if(status.status===200)return}
    catch{}
    if(server.exitCode !== null)break;
    await new Promise(r=>setTimeout(r,100));
  }
  throw Error('Test server did not become healthy');
}
async function close() {
  if(server && server.exitCode === null) server.kill();
}
test('MVX FOS PM static listener is secure and does not claim backend readiness',async t=>{
  await start();
  t.after(close);
  const status=await request('/api/status');
  assert.equal(status.status,200);
  const payload=JSON.parse(status.body);
  assert.equal(payload.service,'Paperclip Real Production UI');
  assert.equal(payload.product,'MVX FOS PM');
  assert.equal(payload.port,PORT);
  assert.equal(payload.backendAuthorized,false);
  assert.equal(status.headers['access-control-allow-origin'],undefined);
  const api=await request('/api/health');assert.equal(api.status,404);
  const root=await request('/');assert.equal(root.status,200);
  assert.match(root.body,/<title>MVX Content Planner/);
  assert.match(root.headers['content-security-policy'],/frame-ancestors/);
  const missing=await request('/assets/no-such-file-xyzzzz.js');
  assert.equal(missing.status,404);
  const read=await request('/%2e%2e%2fpackage.json');
  assert.notEqual(read.status,200);
  const post=await request('/api/status','POST');
  assert.equal(post.status,405);
});
