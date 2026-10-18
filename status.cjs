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
