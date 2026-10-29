import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import worker, { handle, beijingDay, validate } from '../backend/worker.mjs';
import { localDatabase } from '../scripts/d1-local.mjs';
const ORIGIN = 'https://ryanwlab.com';
const BASE = Date.parse('2026-10-29T10:00:00+08:00');
function setup() { return {DB:localDatabase(), IP_HASH_SECRET:'local-test-secret-with-at-least-32-characters', ALLOWED_ORIGINS:ORIGIN}; }
function request(data = {id:randomUUID(),message:'测试留言'}, extra = {}) {
 return new Request('https://messages.example/api/messages', {method:'POST',headers:{Origin:ORIGIN,'Content-Type':'application/json','CF-Connecting-IP':'203.0.113.7',...extra},body:JSON.stringify(data)});
}
const count = env => env.DB.sqlite.prepare('SELECT COUNT(*) AS n FROM messages').get().n;

test('strict 3/day: fourth message rejected, independent IP allowed', async () => {
 const env=setup();
 for(let i=0;i<3;i++) assert.equal((await handle(request(),env,BASE+i*61_000)).status,201);
 const result=await handle(request(),env,BASE+240_000);
 assert.equal(result.status,429);assert.equal((await result.json()).code,'DAILY_LIMIT');
 assert.equal(count(env),3);
 assert.equal((await handle(request(undefined,{'CF-Connecting-IP':'203.0.113.8'}),env,BASE+240_000)).status,201);
});
test('burst requests cannot exceed quota/cooldown; retries are idempotent', async () => {
 const env=setup();
 const results=await Promise.all(Array.from({length:20},()=>handle(request(),env,BASE)));
 assert.equal(results.filter(r=>r.status===201).length,1); assert.equal(count(env),1);
 const data={id:randomUUID(),message:'第二条'};
 const duplicates=await Promise.all(Array.from({length:12},()=>handle(request(data),env,BASE+61_000)));
 assert.ok(duplicates.every(r=>r.ok));assert.equal(count(env),2);
 const conflict=await handle(request({...data,message:'different'}),env,BASE+122_000);
 assert.equal(conflict.status,409);assert.equal(count(env),2);
});
test('atomic database trigger enforces 3 under a direct burst and rejects cooldown', () => {
 const env=setup(), db=env.DB.sqlite;
 const stmt=db.prepare('INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?)');
 for(let i=0;i<3;i++) stmt.run(randomUUID(),'same-ip','2026-10-29','','hi',1000+i*61);
 assert.throws(()=>stmt.run(randomUUID(),'same-ip','2026-10-29','','hi',2000),/MESSAGE_DAILY_LIMIT/);
 assert.equal(count(env),3);
 assert.throws(()=>stmt.run(randomUUID(),'another-ip','2026-10-29','','',2000));
 assert.equal(count(env),3);
});
test('Beijing midnight resets quota; previous-day retry does not double-save', async () => {
 const env=setup();const midnight=Date.parse('2026-10-30T00:00:00+08:00');
 const old={id:randomUUID(),message:'midnight retry'};
 for(let i=0;i<2;i++) await handle(request(),env,midnight-180_000+i*61_000);
 await handle(request(old),env,midnight-50_000);
 assert.equal(beijingDay(midnight-1),'2026-10-29');assert.equal(beijingDay(midnight),'2026-10-30');
 assert.equal((await handle(request(old),env,midnight+1000)).status,200);
 assert.equal(count(env),3);
 assert.equal((await handle(request(),env,midnight+1000)).status,201);
 assert.equal(count(env),4);
});
test('invalid, oversized and whitespace inputs do not consume quota; emoji count is consistent', async () => {
 const env=setup();
 for (const message of ['', '  \n', '字'.repeat(501), '😀'.repeat(501), '\u0000']) {
  assert.equal((await handle(request({id:randomUUID(),message}),env,BASE)).status,400);
 }
 assert.equal((await handle(request({id:randomUUID(),message:'valid',nickname:'长'.repeat(21)}),env,BASE)).status,400);
 assert.equal((await handle(request({id:randomUUID(),message:'x'.repeat(10000)}),env,BASE)).status,413);
 assert.equal(count(env),0);
 assert.ok(validate({id:randomUUID(),message:'😀'.repeat(500)}));
 assert.equal((await handle(request({id:randomUUID(),message:'😀'.repeat(500)}),env,BASE)).status,201);
});
test('origins, methods, trusted IP and configuration fail closed', async () => {
 const env=setup();
 assert.equal((await handle(request(undefined,{Origin:'https://attacker.example'}),env,BASE)).status,403);
 const noIP=request();noIP.headers.delete('CF-Connecting-IP');
 assert.equal((await handle(noIP,env,BASE)).status,503);
 assert.equal((await handle(request(),{...env,IP_HASH_SECRET:''},BASE)).status,503);
 assert.equal((await handle(new Request('https://messages.example/api/messages',{headers:{Origin:ORIGIN}}),env,BASE)).status,405);
 assert.equal(count(env),0);
 const preflight=await handle(new Request('https://messages.example/api/messages',{method:'OPTIONS',headers:{Origin:ORIGIN}}),env,BASE);
 assert.equal(preflight.status,204);assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),ORIGIN);
});
test('message text stays data, no raw IP saved; database failure does not pretend success',async()=>{
 const env=setup();const text="<script>alert(1)</script>'); DROP TABLE messages;--";
 const response=await handle(request({id:randomUUID(),message:text}),env,BASE);
 assert.equal(response.status,201);
 const row=env.DB.sqlite.prepare('SELECT * FROM messages').get();
 assert.equal(row.message,text);assert.equal(row.ip_key.length,64);assert.ok(!JSON.stringify(row).includes('203.0.113.7'));
 const broken={...env,DB:{prepare(){throw new Error('unavailable');}}};
 assert.equal((await handle(request(),broken,BASE)).status,503);
});
test('default Worker fetch ignores execution context; scheduled retention clears old messages',async()=>{
 const env=setup();
 const response=await worker.fetch(request(),env,{waitUntil(){}});assert.equal(response.status,201);
 env.DB.sqlite.prepare('UPDATE messages SET created_at = ?').run(1);
 await worker.scheduled({},env);assert.equal(count(env),0);
});
