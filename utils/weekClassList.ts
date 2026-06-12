interface ClassItem {
  uid: string;
  className: string;
  classId: string;
  teacher: string;
  week: number;
  mounth: number[];
  mounthLabel: string;
  time: number[];
  classRoom: string;
  colorSheet: {
    highlight: string;
    background: string;
  };
}

interface TimeLabelItem {
  from: string;
  to: string;
  label: string;
  time: 'morning' | 'afternoon' | 'night';
}

interface CourseResult {
  id: string;
  className: string;
  fromTo: number[];
  week: number;
  month: string;
  location: string;
  teacher: string;
  colorSheet: {
    highlight: string;
    background: string;
  };
}

interface WeeklySchedule {
  morning: CourseResult[];
  afternoon: CourseResult[];
  night: CourseResult[];
}

/**
 * 计算当前周要上的课程列表
 * @param classList 课程列表
 * @param monthNum 当前周数
 * @param timeLabel 时间段标签
 * @returns 按时间段分组的课程列表
 */
function getWeeklySchedule(
  classList: ClassItem[],
  monthNum: number,
  timeLabel: TimeLabelItem[]
): WeeklySchedule {
  // 初始化结果对象
  const result: WeeklySchedule = {
    morning: [],
    afternoon: [],
    night: []
  };

  // 过滤出当前周的课程
  const currentWeekClasses = classList.filter(course => {
    return course.mounth.includes(monthNum);
  });
  console.log(monthNum);

  // 处理每个课程
  currentWeekClasses.forEach(course => {
    // 获取课程时间段信息（time数组中的索引从1开始，所以减1）
    const timeSlot = timeLabel[course.time[0] - 1];
    if (!timeSlot) return;

    // 创建课程对象
    const classInfo: CourseResult = {
      id: `${monthNum}-${course.week}-${course.time[0]}-${course.time[1]}-${course.uid}`,
      className: course.className,
      fromTo: course.time,
      week: course.week,
      month: course.mounthLabel,
      location: course.classRoom,
      teacher: course.teacher,
      colorSheet: course.colorSheet
    };

    // 根据时间段将课程添加到对应数组
    result[timeSlot.time].push(classInfo);
  });

  // 按fromTo排序
  Object.keys(result).forEach(key => {
    const period = key as 'morning' | 'afternoon' | 'night';
    result[period].sort((a, b) => a.fromTo[0] - b.fromTo[0]);
  });

  return result;
}

export default getWeeklySchedule;