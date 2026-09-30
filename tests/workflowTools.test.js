const assert=require('assert');
const {parsePageRange,createStoredZip}=require('../js/workflowTools.js');
assert.deepStrictEqual(parsePageRange('2','4',8),[2,3,4]);
assert.deepStrictEqual(parsePageRange('1','',3),[1,2,3]);
for(const input of [['0','2',3],['3','2',3],['1','4',3],['1','',51],['1.5','2',3]])assert.throws(()=>parsePageRange(...input));
console.log('PASS: selected pages and invalid / oversized ranges');
(async()=>{const b=await createStoredZip([{name:'한글.png',blob:new Blob(['hello'])}]);const bytes=new Uint8Array(await b.arrayBuffer());const v=new DataView(bytes.buffer);assert.equal(v.getUint32(0,true),0x04034b50);assert.equal(v.getUint32(14,true),0x3610a686);assert.equal(v.getUint16(bytes.length-12,true),1);assert.equal(new TextDecoder().decode(bytes.slice(30,30+v.getUint16(26,true))),'한글.png');console.log('PASS: ZIP filename, checksum, directory');})().catch(e=>{console.error(e);process.exitCode=1;});
