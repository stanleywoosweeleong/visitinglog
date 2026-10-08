import test from 'node:test';
import assert from 'node:assert/strict';
import {sha256,photoBytes,verifyPhoto,cloudPayload} from '../src/photos.js';
test('photo restore rejects corrupted cloud copies',async()=>{const bytes=new Uint8Array([1,2,3]);const expected=await sha256(bytes);const bucket={download:async()=>({data:new Blob([new Uint8Array([1,2,4])])})};await assert.rejects(verifyPhoto(bucket,{path:'private/photo.jpg',sha256:expected}),/verification failed/);});
test('cloud payload strips image bytes from current record and history',()=>{const p=cloudPayload({photos:[{id:'p',data:'large',path:'x'}],history:[{previous:{photos:[{id:'old',data:'large'}]}}]});assert.equal(p.photos[0].data,undefined);assert.equal(p.history[0].previous.photos[0].data,undefined);});
test('invalid image data is rejected before upload',()=>{assert.throws(()=>photoBytes('https://example.com/image.jpg'));});
