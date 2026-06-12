/**
 * 根据起始日期、偏移周数和是否包含周末，返回一周的时间列表
 * @param {Date} startDate - 起始日期
 * @param {number} weekOffset - 周偏移数（可为负数）
 * @param {boolean} includeWeekend - 是否包含周末
 * @returns {Array<{date: string, day: string}>} 一周的时间列表
 */
function getWeekDates(startDate: Date, weekOffset = 0, includeWeekend = true) {
  // 创建日期副本以避免修改原日期
  const date = new Date(startDate);
  
  // 计算目标周的周一
  const dayOfWeek = date.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 周日视为第0天，需调整为-6
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday + weekOffset * 7);
  
  const result = [];
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  
  // 生成一周的日期列表
  for (let i = 0; i < 7; i++) {
    const currentDay = new Date(monday);
    currentDay.setDate(monday.getDate() + i);
    
    // 如果不包含周末，则跳过周六和周日
    const currentDayOfWeek = currentDay.getDay();
    if (!includeWeekend && (currentDayOfWeek === 0 || currentDayOfWeek === 6)) {
      continue;
    }
    
    const month = (currentDay.getMonth() + 1).toString().padStart(2, '0');
    const day = currentDay.getDate().toString().padStart(2, '0');
    
    result.push({
      date: `${month}-${day}`,
      day: days[currentDayOfWeek]
    });
  }
  
  return result;
}

export default getWeekDates;