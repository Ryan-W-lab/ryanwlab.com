// Loopback-only integration preview. No Cloudflare or external network required.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
import {localDatabase} from './d1-local.mjs';
import {handle} from '../backend/worker.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=8766, origin=`http://127.0.0.1:${port}`;
const env={DB:localDatabase(),IP_HASH_SECRET:randomBytes(32).toString('hex'),ALLOWED_ORIGINS:origin};
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.py':'text/plain; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
 try {
  const url=new URL(req.url,origin);
  if(url.pathname==='/api/messages') {
   const chunks=[];let size=0;
   for await(const chunk of req) {size+=chunk.length;if(size>8192){res.writeHead(413);res.end('{}');return;}chunks.push(chunk);}
   const headers=new Headers();
   for(const [key,value] of Object.entries(req.headers)) if(value) headers.set(key,String(value));
   // The preview never trusts a caller-supplied IP header.
   headers.set('CF-Connecting-IP',req.socket.remoteAddress);
   const request=new Request(url,{method:req.method,headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Buffer.concat(chunks)})});
   const result=await handle(request,env);
   res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));return;
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  let relative=decodeURIComponent(url.pathname).replace(/^\/+/, '');
  if(!relative || relative.endsWith('/'))relative+='index.html';
  const allowed=['index.html','en/index.html','LICENSE','robots.txt','sitemap.xml','favicon.svg','favicon.ico','apple-touch-icon.png'].includes(relative)||/^(assets|examples)\//.test(relative);
  const file=path.resolve(root,relative);
  if(!allowed || !file.startsWith(root+path.sep)){res.writeHead(404);res.end();return;}
  let body=await readFile(file);
  if(relative.endsWith('.html'))body=Buffer.from(body.toString().replace(/<meta name="message-api" content="[^"]*">/,`<meta name="message-api" content="${origin}/api/messages">`));
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:body);
 } catch(_){res.writeHead(404);res.end();}
});
server.listen(port,'127.0.0.1',()=>console.log(`Message integration preview: ${origin}/#messages (in-memory test data; no cloud writes)`));
