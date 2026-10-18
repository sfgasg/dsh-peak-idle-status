'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {getStatus,beijingParts,createCalendar,validateCalendar}=require('./status.cjs');
const at=(s)=>new Date(s+'+08:00');
const calendar=createCalendar();
for(const [time,expected] of [
 ['08:59:59','idle'],['09:00:00','peak'],['11:59:59','peak'],['12:00:00','idle'],
 ['13:59:59','idle'],['14:00:00','peak'],['17:59:59','peak'],['18:00:00','idle'],
 ['00:00:00','idle'],['23:59:59','idle']
]) test('工作日边界 '+time,()=>assert.equal(getStatus(at('2026-10-19T'+time),calendar).state,expected));
for(const date of ['2026-10-17','2026-10-18','2026-10-10','2026-02-14','2026-09-20','2026-01-04']) {
 test('周末及调休仍空闲 '+date,()=>assert.equal(getStatus(at(date+'T10:00:00'),calendar).state,'idle'));
}
for(const day of calendar.get(2026).days.filter(d=>d.isOffDay)) {
 test('官方假期全天空闲 '+day.date,()=>{
   for(const time of ['00:00:00','09:00:00','11:59:59','14:00:00','17:59:59','23:59:59']) {
     assert.equal(getStatus(at(day.date+'T'+time),calendar).state,'idle');
   }
 });
}
test('UTC 输入正确转换为北京时间',()=>assert.equal(getStatus(new Date('2026-10-19T01:00:00Z'),calendar).state,'peak'));
test('其他时区输入仍按北京时间',()=>assert.equal(getStatus(new Date('2026-10-18T18:00:00-07:00'),calendar).state,'peak'));
test('北京时间跨日',()=>assert.equal(beijingParts(new Date('2026-10-18T16:00:00Z')).date,'2026-10-19'));
test('假期结束后的工作日',()=>assert.equal(getStatus(at('2026-10-08T10:00:00'),calendar).state,'peak'));
test('缺失年度数据不误判高峰',()=>assert.equal(getStatus(at('2027-01-04T10:00:00'),calendar).state,'unknown'));
test('缺失年度数据时周末仍明确空闲',()=>assert.equal(getStatus(at('2027-01-02T10:00:00'),calendar).state,'idle'));
test('缺失年度数据时非高峰仍明确空闲',()=>assert.equal(getStatus(at('2027-01-04T12:00:00'),calendar).state,'idle'));
test('有效年度数据可注入',()=>{
 const extra={year:2027,papers:['https://www.gov.cn/example'],days:Array.from({length:7},(_,i)=>({date:'2027-01-'+String(i+1).padStart(2,'0'),name:'测试假期',isOffDay:true}))};
 assert.equal(getStatus(at('2027-01-04T10:00:00'),createCalendar({2027:extra})).state,'idle');
});
test('无效缓存会被拒绝',()=>assert.throws(()=>validateCalendar({year:2026,days:[]},2026)));
test('缺失年份会被拒绝',()=>assert.throws(()=>validateCalendar({days:[],papers:[]},undefined)));
test('不可信数据来源会被拒绝',()=>{
 const data=JSON.parse(JSON.stringify(calendar.get(2026)));data.papers=['https://gov.cn.evil.example/x'];
 assert.throws(()=>validateCalendar(data,2026));
});
test('不存在的日期会被拒绝',()=>{
 const data=JSON.parse(JSON.stringify(calendar.get(2026)));data.days[0].date='2026-02-30';
 assert.throws(()=>validateCalendar(data,2026));
});
test('重复日期会被拒绝',()=>{
 const data=JSON.parse(JSON.stringify(calendar.get(2026)));data.days.push(data.days[0]);
 assert.throws(()=>validateCalendar(data,2026));
});
test('无效时间会被拒绝',()=>assert.throws(()=>getStatus(new Date('invalid'),calendar)));
test('客户端工厂与插件生命周期',async()=>{
 class Element {
   constructor(tag){this.tag=tag;this.children=[];this.style={};this.dataset={};this.listeners=new Map();this.attributes={};this.removed=false;this.textContent='';}
   append(...nodes){this.children.push(...nodes);}
   appendChild(node){this.children.push(node);return node;}
   attachShadow(){return this.shadowRoot=new Element('shadow');}
   setAttribute(k,v){this.attributes[k]=v;}
   addEventListener(k,v){this.listeners.set(k,v);}
   removeEventListener(k){this.listeners.delete(k);}
   remove(){this.removed=true;}
 }
 const timers=new Map();let sequence=0;
 const document={body:new Element('body'),createElement:t=>new Element(t),listeners:new Map(),addEventListener(k,v){this.listeners.set(k,v);},removeEventListener(k){this.listeners.delete(k);}};
 let factory;
 const window={__ModuleLoader__:{load:r=>{assert.equal(r.id,'dsh-peak-idle-status');factory=r.factory;}},listeners:new Map(),addEventListener(k,v){this.listeners.set(k,v);},removeEventListener(k){this.listeners.delete(k);}};
 const fakeClock={current:'2026-10-19T00:59:59Z'};
 class FixedDate extends Date {constructor(...args){super(...(args.length?args:[fakeClock.current]));}}
 const context=vm.createContext({window,document,Date:FixedDate,localStorage:{getItem:()=>null,setItem:()=>{}},AbortController,
   fetch:async()=>{throw new Error('模拟离线');},
   setTimeout,clearTimeout,setInterval:(cb,ms)=>{const id=++sequence;timers.set(id,{cb,ms});return id;},clearInterval:id=>timers.delete(id)});
 const source=fs.readFileSync(path.join(__dirname,'client.js'),'utf8');
 vm.runInContext(source,context);
 assert.equal(document.body.children.length,0,'注册工厂不应提前挂载');
 const entry=factory(()=>{throw new Error('客户端不应有外部依赖');});
 let dispose;
 entry.apply({effect(fn){dispose=fn();}});
 const host=document.body.children[0];
 assert.equal(host.dataset.state,'idle');
 const tick=[...timers.values()].find(t=>t.ms===1000);
 fakeClock.current='2026-10-19T01:00:00Z';tick.cb();
 assert.equal(host.dataset.state,'peak','在 09:00 实时切换');
 fakeClock.current='2026-10-19T04:00:00Z';tick.cb();
 assert.equal(host.dataset.state,'idle','在 12:00 实时切换');
 fakeClock.current='2026-10-01T02:00:00Z';tick.cb();
 assert.equal(host.dataset.state,'idle','内嵌假期数据生效');
 await new Promise(resolve=>setImmediate(resolve));
 dispose();
 assert.equal(host.removed,true);
 assert.equal(timers.size,0,'卸载清理全部定时器');
 assert.equal(document.listeners.size,0);
 assert.equal(window.listeners.size,0);
});
