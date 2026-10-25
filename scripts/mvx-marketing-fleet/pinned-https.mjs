import https from 'node:https';
import dns from 'node:dns/promises';
import net from 'node:net';
function deny(ip){
  if(net.isIP(ip)===4){
    const [a,b,c]=ip.split('.').map(Number);
    return a===0||a===10||a===127||a>=224||(a===169&&b===254)||
      (a===172&&b>=16&&b<=31)||(a===192&&b===168)||
      (a===100&&b>=64&&b<=127)||(a===192&&b===0)||(a===198&&(b===18||b===19))||
      (a===192&&b===0&&c===2)||(a===198&&b===51&&c===100)||(a===203&&b===0&&c===113);
  }
  if(net.isIP(ip)===6) {
    const address=ip.toLowerCase();
    return address==='::'||address==='::1'||address.startsWith('fe8')||
      address.startsWith('fe9')||address.startsWith('fea')||address.startsWith('feb')||
      address.startsWith('fc')||address.startsWith('fd')||address.startsWith('ff')||
      address.startsWith('2001:db8')||(address.startsWith('::ffff:')&&deny(address.slice(7)));
  }
  return true;
}
// Native https.request preserves TLS validation against hostname while pinning
// socket-level DNS to an explicitly validated public address; never follows redirects.
export async function fetchPinnedHtml(url,{allowedHosts,resolveHost=dns.lookup,maxBytes=1100000,timeoutMs=12000}={}) {
  const u=new URL(url);
  if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash||
    !allowedHosts?.includes(u.hostname)||net.isIP(u.hostname)||
    u.hostname==='localhost'||u.hostname.endsWith('.local')) throw Error('Untrusted remote origin');
  const addresses=await resolveHost(u.hostname,{all:true});
  if(!addresses.length||addresses.some(x=>deny(x.address))) throw Error('Unsafe DNS target');
  const pin=addresses[0];
  return new Promise((resolve,reject)=>{
    let done=false;
    const fail=e=>{if(!done){done=true;reject(e);}};
    const req=https.get(u,{
      headers:{'User-Agent':'MVX-GrowthOS-Brand-Research/1.0','Accept':'text/html','Accept-Encoding':'identity'},
      lookup:(hostname,options,callback)=>options?.all?
        callback(null,[{address:pin.address,family:pin.family}]):
        callback(null,pin.address,pin.family),
      timeout:timeoutMs,
      maxHeaderSize:16000
    },res=>{
      if(res.statusCode!==200) {res.resume();fail(Error('HTTP '+res.statusCode+' (redirects denied)'));return;}
      if(!(res.headers['content-type']||'').toLowerCase().includes('text/html') ||
        (res.headers['content-encoding']&&res.headers['content-encoding']!=='identity')) {
        res.resume();fail(Error('HTML identity encoding required'));return;
      }
      if(Number(res.headers['content-length']||0)>maxBytes) {
        res.destroy();fail(Error('Page too large'));return;
      }
      let size=0,chunks=[];
      res.on('data',chunk=>{
        size+=chunk.length;
        if(size>maxBytes){res.destroy(Error('Page too large while streaming'));return;}
        chunks.push(chunk);
      });
      res.on('end',()=>{if(!done){done=true;resolve(Buffer.concat(chunks).toString('utf8'));}});
      res.on('error',fail);
    });
    req.on('timeout',()=>req.destroy(Error('Timed out')));
    req.on('error',fail);
  });
}
