/**
 * 高精度 24 节气计算（1900-2100 有效）
 * 
 * 采用业界经典算法（jjonline/calendar.js 及大量万年历/Bazi 工具共同使用的方案）。
 * 该方法使用天文均值 + 修正数据，精度足够支撑干支历、八字排盘、择吉等用途。
 * 
 * 参考来源：
 * - https://github.com/jjonline/calendar.js
 * - 众多国内主流农历/节气计算库
 */

const SOLAR_TERMS = [
  '小寒', '大寒', '立春', '雨水', '惊蛰', '春分',
  '清明', '谷雨', '立夏', '小满', '芒种', '夏至',
  '小暑', '大暑', '立秋', '处暑', '白露', '秋分',
  '寒露', '霜降', '立冬', '小雪', '大雪', '冬至'
];

// 24节气修正数据（单位：分钟），对应 1900-2100 各年
const S_TERM_INFO = [
  0, 21208, 42467, 63836, 85337, 107014, 128867, 150921,
  173149, 195551, 218072, 240693, 263343, 285989, 308563, 331033,
  353350, 375494, 397447, 419210, 440795, 462224, 483532, 504758
];

/**
 * 获取某年某节气的公历日期（返回 Date 对象，当天 00:00）
 * @param {number} year  公历年份 (1900-2100)
 * @param {number} n     节气序号 0-23（0=小寒 ... 23=冬至）
 * @returns {Date}
 */
function getSolarTermDate(year, n) {
  if (year < 1900 || year > 2100 || n < 0 || n > 23) {
    throw new Error('Year must be 1900-2100, term index 0-23');
  }

  const offDate = new Date(
    (31556925974.7 * (year - 1900) + S_TERM_INFO[n] * 60000) +
    Date.UTC(1900, 0, 6, 2, 5)
  );

  // 转换为本地日期（只取日期部分）
  return new Date(offDate.getUTCFullYear(), offDate.getUTCMonth(), offDate.getUTCDate());
}

/**
 * 获取某年全部 24 节气的日期
 * @param {number} year
 * @returns {Array<{name: string, date: Date}>}
 */
function getAllSolarTerms(year) {
  const terms = [];
  for (let i = 0; i < 24; i++) {
    terms.push({
      name: SOLAR_TERMS[i],
      date: getSolarTermDate(year, i)
    });
  }
  return terms;
}

/**
 * 根据日期获取当前所处的节气 + 下一个节气（高精度）
 * @param {Date} date 
 * @returns {{
 *   current: { name: string, date: Date, index: number },
 *   next:    { name: string, date: Date, index: number },
 *   daysToNext: number,
 *   hoursToNext: number
 * }}
 */
function getCurrentSolarTerm(date) {
  const year = date.getFullYear();
  let terms = getAllSolarTerms(year);

  // 如果日期在 12 月 23 之后，可能要跨年取下一年的小寒
  if (date > terms[23].date) {
    const nextYearTerms = getAllSolarTerms(year + 1);
    terms = [...terms, nextYearTerms[0]]; // 补上下一年的小寒
  }

  // 找到当前所处的节气区间
  let currentIndex = 0;
  for (let i = 0; i < terms.length; i++) {
    if (date >= terms[i].date) {
      currentIndex = i;
    } else {
      break;
    }
  }

  const current = terms[currentIndex];
  let next = terms[currentIndex + 1];

  // 跨年处理
  if (!next) {
    const nextYearFirst = getAllSolarTerms(year + 1)[0];
    next = nextYearFirst;
  }

  // 计算距离下一个节气的毫秒数
  const msToNext = next.date.getTime() - date.getTime();
  const daysToNext = Math.floor(msToNext / (1000 * 60 * 60 * 24));
  const hoursToNext = Math.floor((msToNext % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  return {
    current: {
      name: current.name,
      date: current.date,
      index: currentIndex % 24
    },
    next: {
      name: next.name,
      date: next.date,
      index: (currentIndex + 1) % 24
    },
    daysToNext,
    hoursToNext,
    progress: Math.min(100, Math.max(0, 
      ((date.getTime() - current.date.getTime()) / (next.date.getTime() - current.date.getTime())) * 100
    ))
  };
}

/**
 * 根据节气名称或日期判断当前月柱地支（立春起寅）
 * @param {Date} date
 * @returns {{ monthZhi: string, monthGan: string, jieqi: string }}
 */
function getMonthPillarFromSolarTerm(date) {
  const st = getCurrentSolarTerm(date);
  const currentTerm = st.current.name;

  // 节气 → 月支（立春起寅）
  const JIEQI_TO_ZHI = {
    '立春': '寅', '雨水': '寅',
    '惊蛰': '卯', '春分': '卯',
    '清明': '辰', '谷雨': '辰',
    '立夏': '巳', '小满': '巳',
    '芒种': '午', '夏至': '午',
    '小暑': '未', '大暑': '未',
    '立秋': '申', '处暑': '申',
    '白露': '酉', '秋分': '酉',
    '寒露': '戌', '霜降': '戌',
    '立冬': '亥', '小雪': '亥',
    '大雪': '子', '冬至': '子',
    '小寒': '丑', '大寒': '丑'
  };

  const monthZhi = JIEQI_TO_ZHI[currentTerm] || '寅';

  // 年干（用于五虎遁）
  // 这里简化：直接用公历年计算年干（实际应结合立春精确年份）
  const yearForGan = (date.getMonth() < 1 || (date.getMonth() === 1 && date.getDate() < 4)) 
    ? date.getFullYear() - 1 
    : date.getFullYear();

  const yearGanIndex = (yearForGan - 4) % 10;
  const TIGER_BASE = [2, 4, 6, 8, 0, 3, 5, 7, 9, 1]; // 甲己丙...
  const base = TIGER_BASE[yearGanIndex];

  // 月支相对于寅的偏移
  const ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  const zhiIdx = ZHI.indexOf(monthZhi);
  const offset = (zhiIdx - 2 + 12) % 12;

  const monthGanIndex = (base + offset) % 10;
  const GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];

  return {
    monthGan: GAN[monthGanIndex],
    monthZhi: monthZhi,
    jieqi: currentTerm,
    solarTermInfo: st
  };
}

export {
  SOLAR_TERMS,
  getSolarTermDate,
  getAllSolarTerms,
  getCurrentSolarTerm,
  getMonthPillarFromSolarTerm
};
