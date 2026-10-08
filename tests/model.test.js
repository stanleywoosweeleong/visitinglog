import test from 'node:test';
import assert from 'node:assert/strict';
import {filterVisits,inPeriod,validateBackup} from '../src/model.js';
test('Monday week boundary and no future completed visits',()=>{const now=new Date(2026,9,8,12);assert.equal(inPeriod(new Date(2026,9,5,0),'week',now),true);assert.equal(inPeriod(new Date(2026,9,4,23),'week',now),false);assert.equal(inPeriod(new Date(2026,9,9,0),'week',now),false);});
test('supervisor staff filter excludes other staff and trash',()=>{const f=[{id:'f',state:'Pahang'}],v=[{id:'1',farmId:'f',staff:'A',date:'2026-01-01'},{id:'2',farmId:'f',staff:'B',date:'2026-01-01'},{id:'3',farmId:'f',staff:'A',date:'2026-01-01',deletedAt:'2026-01-02'}];assert.deepEqual(filterVisits(v,{staff:'A',period:'all',state:'Pahang'},f).map(x=>x.id),['1']);});
test('restore rejects orphan visits and corrupt formats',()=>{assert.throws(()=>validateBackup({version:1,farms:[],visits:[{id:'v',farmId:'missing',date:'2026-01-01'}]}));assert.throws(()=>validateBackup({version:2,farms:[],visits:[]}));assert.equal(validateBackup({version:1,farms:[{id:'f',name:'Farm'}],visits:[{id:'v',farmId:'f',date:'2026-01-01'}]}).version,1);});
