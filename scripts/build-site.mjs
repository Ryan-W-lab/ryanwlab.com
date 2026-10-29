// Explicit public-file allowlist: backend sources, tests, Git metadata and secrets
// must never be included in the static hosting directory.
import {cp, mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'site-dist');
await mkdir(out,{recursive:true});
const publicFiles=['index.html','en','assets','examples','favicon.ico','favicon.svg','apple-touch-icon.png','robots.txt','sitemap.xml','LICENSE','_headers'];
for(const file of publicFiles) await cp(path.join(root,file),path.join(out,file),{recursive:true,filter:source=>!source.includes('__pycache__') && !source.endsWith('.pyc')});
const endpoint=(process.env.MESSAGE_API_URL || '').trim();
if(endpoint) {
 const url=new URL(endpoint);
 if(url.protocol!=='https:' || url.username || url.password || url.search || url.hash || url.pathname!=='/api/messages') throw new Error('MESSAGE_API_URL must be a public HTTPS /api/messages URL without credentials or query parameters.');
 for(const file of ['index.html','en/index.html']) {
  const target=path.join(out,file);const html=await readFile(target,'utf8');
  await writeFile(target,html.replace(/<meta name="message-api" content="[^"]*">/,`<meta name="message-api" content="${url.href.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}">`));
 }
}
console.log(`Static files prepared in site-dist. Message box: ${endpoint?'configured':'disabled until MESSAGE_API_URL is set'}.`);
