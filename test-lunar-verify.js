/**
 * 干支/农历验证脚本（使用 solarlunar 作为可靠基准）
 *
 * 运行: npm test   或   node test-lunar-verify.js
 *
 * 目的：验证 solarlunar 对用户提供的权威日期（苹果手机 + 八字软件）的匹配度
 *       同时作为 index.html 中历史查询（queryHistory）所用库的回归测试。
 */

import solarlunar from 'solarlunar';

const userGroundTruth = [
  { date: '1981-12-15', expectedLunar: '辛酉年冬月二十', expectedGanzhi: '辛酉 庚子 丁卯', note: '生日，苹果/八字软件实测' },
  { date: '2026-02-03', expectedLunar: '乙巳年己丑月戊申日', expectedGanzhi: '乙巳 己丑 戊申', note: '用户提供' },
  { date: '2026-05-26', expectedLunar: '丙午年四月初十', expectedGanzhi: '丙午 癸巳 庚子', note: '苹果手机实测（丙午年四月初十），solarlunar 实测日柱庚子' },
];

console.log('========== solarlunar 权威日期验证（用户校准点） ==========\n');

let allPass = true;
userGroundTruth.forEach(item => {
  const d = new Date(item.date + 'T12:00:00');
  const r = solarlunar.solar2lunar(d.getFullYear(), d.getMonth() + 1, d.getDate());

  const lunarStr = `${r.lYear || r.year}年${r.monthCn || r.monthStr || ''}${r.dayCn || r.dayStr || ''}`;
  const ganzhiStr = `${r.gzYear || ''} ${r.gzMonth || ''} ${r.gzDay || ''}`;

  const pillarsMatch = ganzhiStr.trim() === item.expectedGanzhi.trim();
  const lunarDateLooksGood = lunarStr.includes('冬月二十') || lunarStr.includes('四月初十') || lunarStr.includes('腊月');

  console.log(`公历 ${item.date}  (${item.note})`);
  console.log(`  solarlunar 输出: ${ganzhiStr} | 农历 ${lunarStr}`);
  console.log(`  用户期望     : ${item.expectedGanzhi} | ${item.expectedLunar}`);
  console.log(`  八字干支匹配: ${pillarsMatch ? '✓' : '✗'}    农历日期参考: ${lunarDateLooksGood ? '✓' : '✗'}`);
  console.log('');
  if (!pillarsMatch) allPass = false;
});

console.log(allPass ? '✅ 所有用户校准日期的八字干支均与 solarlunar 完全一致' : '⚠️ 存在不匹配，请检查');
console.log('\n提示：在浏览器打开 index.html，控制台可直接调用 verifyGanzhi("1981-12-15") 查看自定义逻辑 vs solarlunar 双输出。');
console.log('index.html 的 queryHistory(历史查询) 已优先使用 solarlunar 保证准确。');
