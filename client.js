/* dsh-peak-idle-status 0.1.0 | MIT */
window.__ModuleLoader__.load({id:"dsh-peak-idle-status",factory:(require)=>{
"use strict";
var module={exports:{}};var exports=module.exports;
var core=(()=>{var module={exports:{}};
'use strict';
const BUILTIN_CALENDARS = {"2026":{"$schema":"https://raw.githubusercontent.com/NateScarlet/holiday-cn/master/schema.json","$id":"https://raw.githubusercontent.com/NateScarlet/holiday-cn/master/2026.json","year":2026,"papers":["https://www.gov.cn/zhengce/zhengceku/202511/content_7047091.htm"],"days":[{"name":"元旦","date":"2026-01-01","isOffDay":true},{"name":"元旦","date":"2026-01-02","isOffDay":true},{"name":"元旦","date":"2026-01-03","isOffDay":true},{"name":"元旦","date":"2026-01-04","isOffDay":false},{"name":"春节","date":"2026-02-14","isOffDay":false},{"name":"春节","date":"2026-02-15","isOffDay":true},{"name":"春节","date":"2026-02-16","isOffDay":true},{"name":"春节","date":"2026-02-17","isOffDay":true},{"name":"春节","date":"2026-02-18","isOffDay":true},{"name":"春节","date":"2026-02-19","isOffDay":true},{"name":"春节","date":"2026-02-20","isOffDay":true},{"name":"春节","date":"2026-02-21","isOffDay":true},{"name":"春节","date":"2026-02-22","isOffDay":true},{"name":"春节","date":"2026-02-23","isOffDay":true},{"name":"春节","date":"2026-02-28","isOffDay":false},{"name":"清明节","date":"2026-04-04","isOffDay":true},{"name":"清明节","date":"2026-04-05","isOffDay":true},{"name":"清明节","date":"2026-04-06","isOffDay":true},{"name":"劳动节","date":"2026-05-01","isOffDay":true},{"name":"劳动节","date":"2026-05-02","isOffDay":true},{"name":"劳动节","date":"2026-05-03","isOffDay":true},{"name":"劳动节","date":"2026-05-04","isOffDay":true},{"name":"劳动节","date":"2026-05-05","isOffDay":true},{"name":"劳动节","date":"2026-05-09","isOffDay":false},{"name":"端午节","date":"2026-06-19","isOffDay":true},{"name":"端午节","date":"2026-06-20","isOffDay":true},{"name":"端午节","date":"2026-06-21","isOffDay":true},{"name":"国庆节","date":"2026-09-20","isOffDay":false},{"name":"中秋节","date":"2026-09-25","isOffDay":true},{"name":"中秋节","date":"2026-09-26","isOffDay":true},{"name":"中秋节","date":"2026-09-27","isOffDay":true},{"name":"国庆节","date":"2026-10-01","isOffDay":true},{"name":"国庆节","date":"2026-10-02","isOffDay":true},{"name":"国庆节","date":"2026-10-03","isOffDay":true},{"name":"国庆节","date":"2026-10-04","isOffDay":true},{"name":"国庆节","date":"2026-10-05","isOffDay":true},{"name":"国庆节","date":"2026-10-06","isOffDay":true},{"name":"国庆节","date":"2026-10-07","isOffDay":true},{"name":"国庆节","date":"2026-10-10","isOffDay":false}]}};
function validateCalendar(data, expectedYear) {
  if (!Number.isInteger(expectedYear) || expectedYear < 1900 || expectedYear > 9999 || !data || data.year !== expectedYear || !Array.isArray(data.days) ||
      data.days.length < 7 || data.days.length > 120 ||
      !Array.isArray(data.papers) || !data.papers.length ||
      !data.papers.every(p => typeof p === 'string' && /^https:\/\/(?:[a-z0-9-]+\.)*gov\.cn\//i.test(p))) {
    throw new Error('节假日数据格式或来源无效');
  }
  const seen = new Set();
  for (const day of data.days) {
    if (!day || typeof day.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day.date) ||
        typeof day.isOffDay !== 'boolean' || typeof day.name !== 'string' ||
        day.name.length > 80 || seen.has(day.date)) throw new Error('节假日日期格式无效');
    const date = new Date(day.date + 'T00:00:00Z');
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== day.date ||
        Math.abs(Number(day.date.slice(0,4)) - expectedYear) > 1) throw new Error('节假日日期超出范围');
    seen.add(day.date);
  }
  if (data.days.filter(d => d.isOffDay).length < 7) throw new Error('节假日数据不完整');
  return {year:data.year, papers:[...data.papers], days:data.days.map(d => ({date:d.date,name:d.name,isOffDay:d.isOffDay}))};
}
function createCalendar(extra = {}) {
  const calendar = new Map();
  for (const [year, data] of Object.entries({...BUILTIN_CALENDARS,...extra})) {
    calendar.set(Number(year), validateCalendar(data, Number(year)));
  }
  return calendar;
}
function beijingParts(value = new Date()) {
  const input = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(input.getTime())) throw new RangeError('时间无效');
  // Modern Asia/Shanghai is fixed UTC+08:00; independent of the device timezone.
  const date = new Date(input.getTime() + 8 * 60 * 60 * 1000);
  return {
    year:date.getUTCFullYear(), date:date.toISOString().slice(0,10),
    weekday:date.getUTCDay(), hour:date.getUTCHours(),
    minute:date.getUTCMinutes(), second:date.getUTCSeconds(),
    clock:date.toISOString().slice(11,19)
  };
}
function getStatus(value = new Date(), calendar = createCalendar()) {
  const local = beijingParts(value);
  const matches = [];
  for (const data of calendar.values()) for (const day of data.days) {
    if (day.date === local.date && day.isOffDay) matches.push(day);
  }
  const holiday = matches[0];
  const weekend = local.weekday === 0 || local.weekday === 6;
  const minute = local.hour * 60 + local.minute;
  const inWindow = (minute >= 540 && minute < 720) || (minute >= 840 && minute < 1080);
  const knownYear = calendar.has(local.year);
  let state, reason;
  if (holiday) { state='idle'; reason=holiday.name+'假期'; }
  else if (weekend) { state='idle'; reason='周末（含调休上班日）'; }
  else if (!inWindow) { state='idle'; reason='非高峰时段'; }
  else if (!knownYear) { state='unknown'; reason=local.year+' 年节假日数据待更新'; }
  else { state='peak'; reason='工作日高峰时段'; }
  return {...local,state,label:state==='peak'?'高峰':state==='idle'?'空闲':'待核验',reason,knownYear};
}
module.exports = {createCalendar,beijingParts,getStatus,validateCalendar};

return module.exports;})();

const {createCalendar,beijingParts,getStatus,validateCalendar}=core;
const STORAGE_PREFIX='dsh-peak-idle-status:calendar:';
const URLS=[
  'https://cdn.jsdelivr.net/gh/NateScarlet/holiday-cn@master/',
  'https://raw.githubusercontent.com/NateScarlet/holiday-cn/master/'
];
exports.name='dsh-peak-idle-status-client';
exports.inject=[];
exports.apply=function apply(ctx) {
  ctx.effect(() => {
    let stopped=false,detailsOpen=false,refreshing=false,latestYear=0;
    const calendar=createCalendar();
    const controllers=new Set();
    let lastLabel='';
    const host=document.createElement('div');
    host.id='dsh-peak-idle-status';
    const root=host.attachShadow({mode:'open'});
    const style=document.createElement('style');
    style.textContent=[
      ':host{position:fixed;right:20px;bottom:20px;z-index:10000;color-scheme:light dark;font:13px/1.5 system-ui,-apple-system,"Microsoft YaHei",sans-serif;color:#e2e8f0}',
      '*{box-sizing:border-box}.card{width:210px;border:1px solid #334155;border-radius:14px;background:#0f172af5;box-shadow:0 6px 25px #0004;overflow:hidden}',
      '.toggle{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;padding:10px 13px;border:0;background:transparent;color:inherit;cursor:pointer;font:inherit;text-align:left}',
      '.toggle:hover{background:#1e293b}.toggle:focus-visible,.refresh:focus-visible{outline:2px solid #38bdf8;outline-offset:-3px}',
      '.status{font-size:16px;font-weight:700}.peak{color:#fbbf24}.idle{color:#34d399}.unknown{color:#cbd5e1}',
      '.clock{font-size:12px;font-variant-numeric:tabular-nums;color:#cbd5e1}.body{padding:0 13px 12px}.date,.note{color:#94a3b8;font-size:11px}',
      '.reason{margin-top:2px}.detail{border-top:1px solid #334155;margin-top:9px;padding-top:9px;font-size:12px}.detail[hidden]{display:none}',
      '.refresh{margin-top:8px;border:1px solid #475569;border-radius:6px;background:#1e293b;color:#e2e8f0;padding:4px 9px;font:inherit;cursor:pointer}',
      '.warning{color:#fbbf24;margin-top:6px}.sync{margin-top:6px;color:#94a3b8;font-size:11px}',
      '@media(max-width:520px){:host{right:8px;bottom:8px}.card{width:190px}}'
    ].join('');
    const card=document.createElement('section');card.className='card';
    card.setAttribute('aria-label','DSH 高峰与空闲实时状态');
    const toggle=document.createElement('button');toggle.type='button';toggle.className='toggle';
    toggle.setAttribute('aria-expanded','false');toggle.title='展开或收起时段规则';
    const label=document.createElement('span');label.className='status';label.setAttribute('role','status');label.setAttribute('aria-live','polite');
    const clock=document.createElement('span');clock.className='clock';
    toggle.append(label,clock);
    const body=document.createElement('div');body.className='body';
    const date=document.createElement('div');date.className='date';
    const reason=document.createElement('div');reason.className='reason';
    const warning=document.createElement('div');warning.className='warning';
    const detail=document.createElement('div');detail.className='detail';detail.hidden=true;
    const rules=document.createElement('div');
    rules.textContent='北京时间（UTC+8）｜周一至周五 09:00–12:00、14:00–18:00 为高峰；结束时刻立即转空闲。周末（含调休上班日）和中国法定节假日/放假调休休息日全天空闲。';
    const note=document.createElement('div');note.className='note';note.textContent='按自定义时段规则显示，每秒刷新。节假日联网来源：holiday-cn（国务院公告整理）。';
    const sync=document.createElement('div');sync.className='sync';
    const refresh=document.createElement('button');refresh.type='button';refresh.className='refresh';refresh.textContent='更新节假日';
    detail.append(rules,note,sync,refresh);body.append(date,reason,warning,detail);card.append(toggle,body);root.append(style,card);
    document.body.appendChild(host);
    function readCache(year) {
      try {
        const raw=localStorage.getItem(STORAGE_PREFIX+year);
        if (raw) calendar.set(year,validateCalendar(JSON.parse(raw),year));
      } catch (_) { /* Invalid or unavailable cache never replaces built-in data. */ }
    }
    function render() {
      if(stopped) return;
      const s=getStatus(new Date(),calendar);
      if(s.year!==latestYear) {
        latestYear=s.year;
        for(const year of [s.year-1,s.year,s.year+1]) readCache(year);
        void refreshCalendars();
        return render();
      }
      const content=(s.state==='peak'?'● ':s.state==='idle'?'● ':'? ')+s.label;
      if(lastLabel!==content) {label.textContent=content;lastLabel=content;}
      label.className='status '+s.state;
      clock.textContent=s.clock;
      date.textContent=s.date+' · 北京时间';
      reason.textContent=s.reason;
      warning.textContent=s.knownYear?'':s.year+' 年节假日数据未就绪，工作日高峰窗口暂不判定。';
      host.dataset.state=s.state;
    }
    async function fetchYear(year) {
      for(const base of URLS) {
        if(stopped) return false;
        const controller=new AbortController();controllers.add(controller);
        const timeout=setTimeout(()=>controller.abort(),8000);
        try {
          const response=await fetch(base+year+'.json',{signal:controller.signal,cache:'no-cache',credentials:'omit',referrerPolicy:'no-referrer'});
          if(!response.ok) throw new Error('HTTP '+response.status);
          const data=validateCalendar(await response.json(),year);
          if(stopped) return false;
          calendar.set(year,data);
          try {localStorage.setItem(STORAGE_PREFIX+year,JSON.stringify(data));} catch (_) {}
          return true;
        } catch (_) {
          if(stopped) return false;
        } finally {clearTimeout(timeout);controllers.delete(controller);}
      }
      return false;
    }
    async function refreshCalendars() {
      if(stopped||refreshing) return;
      refreshing=true;refresh.disabled=true;sync.textContent='正在更新节假日…';
      const year=beijingParts().year;
      try {
        const results=await Promise.all([fetchYear(year),fetchYear(year+1)]);
        if(stopped) return;
        const currentOk=results[0],nextOk=results[1];
        sync.textContent=currentOk?('已更新 '+year+' 年'+(nextOk?'及下一年':'；下一年尚未获取')):(calendar.has(year)?'联网更新未成功，继续使用已保存的 '+year+' 年数据':'联网未成功，请稍后重试或导入该年数据');
      } finally {
        refreshing=false;
        if(!stopped) {refresh.disabled=false;render();}
      }
    }
    // Import an annual holiday-cn JSON without requiring internet access.
    const importLabel=document.createElement('label');importLabel.className='note';importLabel.textContent=' 离线导入年度 JSON ';
    const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.style.width='100%';
    input.addEventListener('change',async()=>{
      const file=input.files&&input.files[0];if(!file) return;
      try {
        if(file.size>100000) throw new Error('文件过大');
        const data=JSON.parse(await file.text());const clean=validateCalendar(data,data.year);
        if(stopped) return;
        calendar.set(clean.year,clean);
        try {localStorage.setItem(STORAGE_PREFIX+clean.year,JSON.stringify(clean));} catch (_) {}
        sync.textContent='已导入 '+clean.year+' 年数据';render();
      } catch(_) {if(!stopped) sync.textContent='导入失败：请选择完整的 holiday-cn 年度 JSON。';}
      input.value='';
    });
    importLabel.append(input);detail.append(importLabel);
    toggle.addEventListener('click',()=>{detailsOpen=!detailsOpen;detail.hidden=!detailsOpen;toggle.setAttribute('aria-expanded',String(detailsOpen));});
    refresh.addEventListener('click',()=>{void refreshCalendars();});
    const tick=setInterval(render,1000);
    const update=setInterval(()=>{void refreshCalendars();},6*60*60*1000);
    const onFocus=()=>render();
    document.addEventListener('visibilitychange',onFocus);
    window.addEventListener('focus',onFocus);
    render();
    return () => {
      stopped=true;clearInterval(tick);clearInterval(update);
      for(const controller of controllers) controller.abort();
      document.removeEventListener('visibilitychange',onFocus);
      window.removeEventListener('focus',onFocus);
      host.remove();
    };
  },'dsh-peak-idle-status: widget lifecycle');
};

return module.exports;}});
