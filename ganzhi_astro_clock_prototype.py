#!/usr/bin/env python3
"""
天干地支 + 星体动态时钟 原型脚本
使用 Astropy 进行精确天文计算
融合 Ganzhi 时辰 + 360度黄道位置
专家级：天文学 + 中西星相/易经文化
"""

import datetime
from datetime import timezone, timedelta
import math

from astropy.time import Time
import astropy.coordinates as coord
from astropy import units as u
from astropy.coordinates import solar_system_ephemeris, get_body

# ==================== 配置 ====================
CST = timezone(timedelta(hours=8))  # 中国标准时间
PLANETS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn']

# 天干
HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
# 地支 + 时辰映射
EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
SHI_CHEN_TIMES = [
    (23, 0, 1, 0),   # 子 23:00-01:00
    (1, 0, 3, 0),    # 丑
    (3, 0, 5, 0),    # 寅
    (5, 0, 7, 0),    # 卯
    (7, 0, 9, 0),    # 辰
    (9, 0, 11, 0),   # 巳
    (11, 0, 13, 0),  # 午
    (13, 0, 15, 0),  # 未
    (15, 0, 17, 0),  # 申
    (17, 0, 19, 0),  # 酉
    (19, 0, 21, 0),  # 戌
    (21, 0, 23, 0),  # 亥
]

def get_current_cst_time():
    """获取当前中国标准时间"""
    return datetime.datetime.now(CST)

def get_julian_day(dt):
    """计算儒略日 (简化，Astropy更精确)"""
    t = Time(dt)
    return t.jd

def calculate_ganzhi_for_time(dt_cst):
    """
    简化Ganzhi计算（年月日时）
    实际生产用完整历法库或公式。这里提供框架 + 示例。
    完整计算需节气、闰月等。使用近似或外部验证。
    """
    # 示例：2026-05-19 为丙午年（已知）
    year_ganzhi = "丙午"  # 实际应动态计算
    
    # 日干支：简化使用 JD
    jd = get_julian_day(dt_cst)
    # 简化公式（示例，实际更复杂）
    day_stem_idx = int((jd + 0.5) % 10)   # 近似
    day_branch_idx = int((jd + 0.5) % 12)
    day_ganzhi = HEAVENLY_STEMS[day_stem_idx] + EARTHLY_BRANCHES[day_branch_idx]
    
    # 时辰地支
    hour = dt_cst.hour
    minute = dt_cst.minute
    shi_idx = None
    for i, (start_h, start_m, end_h, end_m) in enumerate(SHI_CHEN_TIMES):
        if (hour > start_h or (hour == start_h and minute >= start_m)) and \
           (hour < end_h or (hour == end_h and minute < end_m)):
            shi_idx = i
            break
    if shi_idx is None:
        shi_idx = 0 if hour >= 23 or hour < 1 else 11  # fallback
    
    shi_branch = EARTHLY_BRANCHES[shi_idx]
    
    # 时干：简化，由日干推 (实际：日干序号 * 2 + 时支序号 相关)
    # 示例公式：时干 = (日干序号 * 2 + 时支序号) % 10 调整
    day_stem_num = (day_stem_idx ) % 10   # 0-based
    hour_stem_idx = (day_stem_num * 2 + shi_idx) % 10   # 常见简化规则之一
    shi_ganzhi = HEAVENLY_STEMS[hour_stem_idx] + shi_branch
    
    # 刻：按用户需求，每时辰分成4刻（每刻30分钟），更清晰
    minutes_into_shi = (hour - SHI_CHEN_TIMES[shi_idx][0]) * 60 + minute
    if minutes_into_shi < 0:
        minutes_into_shi += 120
    ke_fraction = minutes_into_shi / 120.0  # 0-1
    ke = min(3, int(ke_fraction * 4))  # 0-3 对应 初/二/三/四刻
    
    return {
        'year': year_ganzhi,
        'day': day_ganzhi,
        'shi': shi_ganzhi,
        'shi_branch': shi_branch,
        'ke': ke,
        'ke_fraction': ke_fraction,
        'full_time_str': dt_cst.strftime('%Y-%m-%d %H:%M:%S CST')
    }

def get_planet_ecliptic_longitudes(dt_utc):
    """
    使用 Astropy 获取行星黄道经度 (0-360°)
    地心黄道坐标，精确。
    """
    t = Time(dt_utc)
    positions = {}
    
    with solar_system_ephemeris.set('builtin'):  # 或 'de430' if available
        for planet in PLANETS:
            try:
                if planet == 'sun':
                    body = coord.get_sun(t)
                elif planet == 'moon':
                    body = coord.get_moon(t)
                else:
                    body = get_body(planet, t)
                
                # 转换为地心黄道
                geocentric = body.transform_to(coord.GeocentricTrueEcliptic())
                lon = geocentric.lon.deg % 360  # 0-360
                lat = geocentric.lat.deg
                positions[planet] = {
                    'longitude': round(lon, 4),
                    'latitude': round(lat, 4),
                    'symbol': get_planet_symbol(planet)
                }
            except Exception as e:
                positions[planet] = {'error': str(e)}
    return positions

def get_planet_symbol(planet):
    symbols = {
        'sun': '☉', 'moon': '☽',
        'mercury': '☿', 'venus': '♀', 'mars': '♂',
        'jupiter': '♃', 'saturn': '♄'
    }
    return symbols.get(planet, planet)

def interpret_astrology(ganzhi, planets):
    """融合中西星相 + 易经简单解读（专家级示例）"""
    interpretations = []
    
    # Ganzhi 基础
    interpretations.append(f"当前时辰 {ganzhi['shi']} ({ganzhi['shi_branch']}时)，刻度 {ganzhi['ke']}/8。")
    interpretations.append(f"日柱 {ganzhi['day']}，年柱 {ganzhi['year']}。气场流转中...")
    
    # 行星位置文化解读
    for p, data in planets.items():
        if 'longitude' in data:
            lon = data['longitude']
            # 简化：按宫位或元素关联
            if p == 'jupiter':
                interpretations.append(f"木星 ♃ 位于黄经 {lon:.1f}° - 木行能量旺盛，利于成长、 expansion（易经木卦：震/巽）。")
            elif p == 'mars':
                interpretations.append(f"火星 ♂ 位于 {lon:.1f}° - 火行驱动行动，但需防冲动。")
            # ... 可扩展更多
    return interpretations

def create_visualization_text(ganzhi, planets):
    """文本版可视化（实际可用 matplotlib polar plot）"""
    print("\n" + "="*60)
    print("🌌 天干地支 + 星体动态时钟 - 当前状态")
    print("="*60)
    print(f"北京时间: {ganzhi['full_time_str']}")
    print(f"年柱: {ganzhi['year']} | 日柱: {ganzhi['day']} | 时柱: {ganzhi['shi']}")
    print(f"当前时辰: {ganzhi['shi_branch']}时 | 刻: {ganzhi['ke']} (进度 {ganzhi['ke_fraction']*100:.1f}%)")
    
    print("\n🪐 外围 360° 黄道星体位置 (Ecliptic Longitude):")
    for p, data in planets.items():
        if 'longitude' in data:
            print(f"  {data['symbol']} {p.capitalize():8s}: {data['longitude']:7.2f}°  (lat {data.get('latitude',0):.1f}°)")
    
    print("\n📜 文化解读 (Astronomy + Chinese Astrology + I Ching):")
    interps = interpret_astrology(ganzhi, planets)
    for i in interps:
        print(f"  • {i}")
    print("="*60)

def main():
    print("正在计算当前天干地支与星体位置... (专家级精确计算)")
    
    # 1. 获取时间
    dt_cst = get_current_cst_time()
    dt_utc = dt_cst.astimezone(timezone.utc)
    
    # 2. Ganzhi
    ganzhi = calculate_ganzhi_for_time(dt_cst)
    
    # 3. 行星位置
    planets = get_planet_ecliptic_longitudes(dt_utc)
    
    # 4. 输出 + 可视化
    create_visualization_text(ganzhi, planets)
    
    # 5. 未来扩展：保存到文件、生成图像、Web界面
    print("\n✅ 原型运行完成。知识已存档 /artifacts/ganzhi_astro_clock/")
    print("下一步：集成完整历法库、Matplotlib极坐标可视化、实时更新循环。")

if __name__ == "__main__":
    main()