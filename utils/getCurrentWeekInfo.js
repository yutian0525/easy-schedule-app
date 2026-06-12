/**
 * 计算当前日期相对于学期开始时间是第几周、周几以及年月日信息
 * @param {Date} semesterStartDate - 学期开始时间
 * @returns {Object} 包含周数、星期几和年月日信息的对象
 */
export function getCurrentWeekInfo(semesterStartDate) {
    if (!(semesterStartDate instanceof Date) || isNaN(semesterStartDate.getTime())) {
        throw new Error('Invalid semester start date provided');
    }

    const now = new Date();

    // 确保计算基于同一时间标准
    const semesterStart = new Date(semesterStartDate);
    semesterStart.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    // 计算两个日期之间的毫秒差
    const timeDiff = now.getTime() - semesterStart.getTime();

    // 转换为天数差
    const dayDiff = Math.floor(timeDiff / (1000 * 3600 * 24));

    // 计算周数（向上取整，第一周即使不满7天也算一周）
    // 获取学期开始日期是星期几（1=周一, 2=周二, ..., 7=周日）
    const startDayOfWeek = semesterStart.getDay() === 0 ? 7 : semesterStart.getDay();
    
    // 调整天数差，使得周一作为每周的开始
    const adjustedDayDiff = dayDiff + (startDayOfWeek - 1);
    
    // 计算周数（向上取整）
    const weekNum = Math.ceil((adjustedDayDiff + 1) / 7);

    // 计算星期几（1=周一, 2=周二, ..., 7=周日）
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();

    // 获取年月日信息
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 月份从0开始，需要+1
    const date = now.getDate();

    return {
        week: weekNum,
        day: dayOfWeek,
        year: year,
        month: month,
        date: date
    };
}