// Exercise the native adapter with in-memory platform interfaces, never real credentials.
const assert=require('assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm'),ts=require('typescript');
const source=fs.readFileSync(path.resolve(__dirname,'../../src/services/tokenStore.ts'),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
let secure=null,legacy='synthetic-legacy-value',fail=false;
const order=[];
const sandbox={exports:{},require:name=>{
  if(name==='expo-secure-store')return {getItemAsync:async()=>secure,setItemAsync:async(_key,value)=>{if(fail)throw Error('storage unavailable');secure=value;order.push('secure-write');},deleteItemAsync:async()=>{secure=null;}};
  return {getItem:async()=>legacy,removeItem:async()=>{legacy=null;order.push('legacy-remove');}};
}};
vm.runInNewContext(code,sandbox);
(async()=>{
 const store=sandbox.exports.tokenStore;
 assert.equal(await store.get(),'synthetic-legacy-value');assert.deepEqual(order,['secure-write','legacy-remove']);assert.equal(legacy,null);
 legacy='stale-copy';await store.get();assert.equal(legacy,null);
 await store.remove();assert.equal(secure,null);assert.equal(legacy,null);
 legacy='synthetic-unmigrated-value';fail=true;
 await assert.rejects(store.get());assert.equal(legacy,'synthetic-unmigrated-value');assert.equal(secure,null);
 console.log(JSON.stringify({checks:4,passed:true,scope:'Native adapter ordering and failure handling with mocked platform storage; device behavior not tested'}));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
