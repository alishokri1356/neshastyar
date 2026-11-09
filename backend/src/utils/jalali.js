// Jalali (Shamsi) <-> Gregorian conversion, based on the jalaali-js algorithm.
const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394,
  2456, 3178,
];

// Iran has used a fixed UTC+03:30 offset since daylight saving was abolished in 2022.
const TEHRAN_OFFSET_MINUTES = 210;

const div = (a, b) => ~~(a / b);
const mod = (a, b) => a - ~~(a / b) * b;

function jalCal(jy) {
  const gy = jy + 621;
  let leapJ = -14;
  let jp = BREAKS[0];
  let jump = 0;
  for (let i = 1; i < BREAKS.length; i += 1) {
    const jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}

function g2d(gy, gm, gd) {
  let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4)
    + div(153 * mod(gm + 9, 12) + 2, 5)
    + gd - 34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function j2d(jy, jm, jd) {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function jalaliMonthLength(jy, jm) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return jalCal(jy).leap === 0 ? 30 : 29;
}

function toGregorian(jy, jm, jd) {
  return d2g(j2d(jy, jm, jd));
}

function toInt(value) {
  const normalized = String(value ?? '')
    .trim()
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  if (!/^-?\d+$/.test(normalized)) return null;
  return Number(normalized);
}

/** Tehran wall-clock Jalali date/time -> UTC Date, or null when the parts are invalid. */
function tehranJalaliToUtcDate({ year, month, day, hour = 0, minute = 0 } = {}) {
  const jy = toInt(year);
  const jm = toInt(month);
  const jd = toInt(day);
  const h = hour == null || hour === '' ? 0 : toInt(hour);
  const min = minute == null || minute === '' ? 0 : toInt(minute);
  if ([jy, jm, jd, h, min].some((v) => v == null)) return null;
  if (jy < 1300 || jy > 1500 || jm < 1 || jm > 12) return null;
  if (jd < 1 || jd > jalaliMonthLength(jy, jm)) return null;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;

  const { gy, gm, gd } = toGregorian(jy, jm, jd);
  const utcMs = Date.UTC(gy, gm - 1, gd, h, min) - TEHRAN_OFFSET_MINUTES * 60 * 1000;
  return new Date(utcMs);
}

/** UTC Date -> Tehran wall-clock Jalali parts. */
function utcDateToTehranJalali(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(d);
  const get = (type) => Number((parts.find((p) => p.type === type) || {}).value);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  };
}

module.exports = {
  toGregorian,
  jalaliMonthLength,
  tehranJalaliToUtcDate,
  utcDateToTehranJalali,
};
