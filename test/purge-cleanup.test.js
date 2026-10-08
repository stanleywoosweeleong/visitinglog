import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cleanupPhotos} from '../backend/functions/purge-record/cleanup.ts';
function fixture(fail=false){const files=[{name:'photo.jpg'}],deleted=[],job={record_id:'disposable',prefix:'org/user/disposable'};const query={select(){return this;},order(){return this;},limit(){return this;},then(resolve){resolve({data:[job]});},delete(){return {eq:async()=>{deleted.push(job.record_id);return {};}};}};return {files,deleted,db:{from(){return query;},storage:{from(){return {list:async()=>({data:[...files]}),remove:async paths=>{if(fail)return {error:Error('Unavailable')};assert.deepEqual(paths,['org/user/disposable/photo.jpg']);files.length=0;return {};}};}}}};}
test('photo cleanup verifies empty storage before removing the retry job',async()=>{const f=fixture();assert.equal(await cleanupPhotos(f.db),0);assert.equal(f.files.length,0);assert.deepEqual(f.deleted,['disposable']);});
test('failed photo cleanup retains the retry job',async()=>{const f=fixture(true);assert.equal(await cleanupPhotos(f.db),1);assert.equal(f.files.length,1);assert.deepEqual(f.deleted,[]);});
