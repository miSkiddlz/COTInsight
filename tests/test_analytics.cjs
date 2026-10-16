const {test}=require('node:test');
const assert=require('node:assert/strict');
const a=require('../site/analytics.js');
const records=Array.from({length:53},(_,i)=>({date:a.shift('2026-10-06',-(52-i)*7),unit:'A',open_interest:1000,groups:{test:{long:100+i,short:100,net:i,spreading:null}}}));
test('calendar windows and empirical midranks',()=>{const w=a.summarize(records,['test']).groups.test.windows['52'];assert.equal(w.n,52);assert.equal(w.min,1);assert.equal(w.cot_index,100);assert.equal(w.percentile,100*51.5/52);});
test('ties, flat ranges and minimum coverage',()=>{assert.equal(a.rankMetrics(Array(52).fill(5),5,52).percentile,50);assert.equal(a.rankMetrics(Array(52).fill(5),5,52).cot_index,null);assert.equal(a.rankMetrics(Array(41).fill(5),5,52).percentile,null);});
test('historical dates cannot see later observations',()=>{const s=a.summarize(records,['test'],records[43].date);assert.equal(s.groups.test.net,43);assert.equal(s.groups.test.windows['52'].max,43);});
test('same-unit segment cannot bridge a different intervening unit',()=>{const data=structuredClone(records);data[51].unit='B';const s=a.summarize(data,['test']);assert.equal(s.groups.test.windows['52'].n,1);assert.equal(s.groups.test.changes['1'].net,null);});
test('missing weeks and zero denominators are not fabricated',()=>{const data=structuredClone(records);data.splice(51,1);assert.equal(a.summarize(data,['test']).groups.test.changes['1'].net,null);assert.equal(a.share(1,0),null);assert.equal(a.share(null,100),null);assert.equal(a.share(0,100),0);});
test('date range respects endpoints without padding',()=>{assert.equal(a.range(records,records.at(-1).date,13).length,13);assert.equal(a.range(records,records[30].date,null).length,31);});

test('rolling ranks agree with independently selected historical windows at every observation',()=>{
 const timeline=a.rankHistory(records,'test',52);
 for(let i=0;i<records.length;i++){
  const row=timeline[i],count=Math.min(i+1,52);
  assert.equal(row.n,count);assert.equal(row.required,42);
  assert.equal(row.min,Math.max(0,i-51));assert.equal(row.max,i);
  assert.equal(row.percentile,count<42?null:100*(count-.5)/count);
  assert.equal(row.cot_index,count<42?null:100);
 }
});
test('rolling history never uses later observations and honors as-of cutoffs',()=>{
 const original=a.rankHistory(records,'test',26,records[30].date);
 const changed=structuredClone(records);for(let i=31;i<changed.length;i++)changed[i].groups.test.net=-100000;
 assert.deepEqual(a.rankHistory(changed,'test',26,records[30].date),original);
 assert.deepEqual(a.rankHistory(records,'test',26).slice(0,31),original);
 assert.equal(original.at(-1).date,records[30].date);
});
test('rolling windows restart at every unit boundary, even when an earlier unit returns',()=>{
 const data=structuredClone(records);data[49].unit='B';
 const timeline=a.rankHistory(data,'test',26);
 assert.equal(timeline[49].n,1);assert.equal(timeline[50].n,1);assert.equal(timeline[52].n,3);
 assert.equal(timeline[52].percentile,null);
});
test('rolling ranks retain missing data, zero and flat-range distinctions',()=>{
 const data=structuredClone(records).map(r=>({...r,groups:{test:{net:0}}}));
 data[51].groups.test.net=null;
 const timeline=a.rankHistory(data,'test',26);
 assert.equal(timeline[51].percentile,null);assert.equal(timeline[51].n,25);
 assert.equal(timeline[52].percentile,50);assert.equal(timeline[52].cot_index,null);assert.equal(timeline[52].net,0);
});
test('rolling windows count actual observations and do not fill missing calendar weeks',()=>{
 const data=records.filter((_,i)=>i%2===0),timeline=a.rankHistory(data,'test',26);
 assert.equal(timeline.at(-1).n,13);assert.equal(timeline.at(-1).percentile,null);
 assert.equal(timeline.length,data.length);assert.deepEqual(a.rankHistory([], 'test',26),[]);
});
test('unsupported rolling windows are rejected',()=>{
 for(const value of [0,1,25,27,Infinity,'bad'])assert.throws(()=>a.rankHistory(records,'test',value));
});
