const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const root = require('path').join(__dirname, '..');
function element() { return {hidden:false,disabled:false,value:'',textContent:'',listeners:{},classList:{add(){},remove(){},toggle(){}},addEventListener(k,f){this.listeners[k]=f;},querySelector(){return element();},focus(){},scrollIntoView(){}}; }
const els = {};
const context = {document:{getElementById(id){return els[id] ||= element();}},window:element(),URL:{revokeObjectURL(){},createObjectURL(){return 'blob:test';}},wireShareButton(){},isSupportedImageType(){return true;},resolveOutputMimeType(){return 'image/png';}};
vm.createContext(context);
Object.assign(context, require(root+'/js/imageTools.js'));
vm.runInContext(fs.readFileSync(root+'/js/uploadUtil.js','utf8'),context);
vm.runInContext(fs.readFileSync(root+'/js/app.js','utf8'),context);
const first={name:'first.png',size:100,type:'image/png'};
context.handleFile(first);
els.compressBtn.disabled=true;
context.handleFile({name:'second.png',size:400,type:'image/png'});
assert.strictEqual(context.selectedFile,first,'Replacing a file during compression must not change the active input');
console.log('PASS: busy compression rejects file replacement');
