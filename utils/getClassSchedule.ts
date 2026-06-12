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

interface ResultClassItem {
  id: string;
  startTime: string;
  endTime: string;
  className: string;
  fromTo: number[];
  week: number;
  month: string;
  location: string;
  teacher: string;
  status: 'prepare' | 'ongoing' | 'ended';
  time: string;
  colorSheet: {
    highlight: string;
    background: string;
  };
}

type ResultType = {
  morning: ResultClassItem[];
  afternoon: ResultClassItem[];
  night: ResultClassItem[];
};

/**
 * 获取指定星期和周数的课程列表
 * @param classList 课程列表
 * @param weekNum 当前是星期几 (1-7)
 * @param monthNum 当前是第几周 (1-...)
 * @param timeLabel 时间段标签
 * @returns 按时间段分类的课程列表
 */
function getClassSchedule(
  classList: ClassItem[],
  weekNum: number,
  monthNum: number,
  timeLabel: TimeLabelItem[]
): ResultType {
  // 初始化结果对象
  const result: ResultType = {
    morning: [],
    afternoon: [],
    night: []
  };

  // 过滤出符合当前星期和周数的课程
  const filteredClasses = classList.filter(item => 
    item.week === weekNum && item.mounth.includes(monthNum)
  );

  // 遍历过滤后的课程并转换成目标格式
  filteredClasses.forEach((item) => {
    // 获取课程开始和结束的时间段索引
    let [startIndex, endIndex] = item.time;
    startIndex = startIndex - 1;
    endIndex = endIndex - 1;
    
    // 确保索引有效
    if (startIndex >= 0 && startIndex < timeLabel.length && 
        endIndex >= 0 && endIndex < timeLabel.length) {
      
      // 构建ID
      const id = `${weekNum}-${item.time[0]}-${item.time[1]}-${item.uid}`;
      
      // 获取开始和结束时间
      const startTime = timeLabel[startIndex].from;
      const endTime = timeLabel[endIndex].to;
      
      // 确定时间段类别
      const period = timeLabel[startIndex].time;
      
      // 创建新课程对象
      const newClassItem: ResultClassItem = {
        id,
        startTime,
        endTime,
        className: item.className,
        fromTo: item.time,
        week: item.week,
        month: item.mounthLabel,
        location: item.classRoom,
        teacher: item.teacher,
        status: 'prepare', // 默认状态
        time: '',          // 默认时间
        colorSheet: { ...item.colorSheet }
      };
      
      // 计算课程状态和时间
      calculateStatusAndTime(newClassItem);
      
      // 添加到相应的时间段数组中
      result[period].push(newClassItem);
    }
  });

  // 对每个时间段的课程按起始时间索引排序
  Object.keys(result).forEach(key => {
    result[key as keyof ResultType].sort((a, b) => a.fromTo[0] - b.fromTo[0]);
  });

  return result;
}

/**
 * 根据当前时间计算课程的状态和剩余/等待时间
 * @param classItem 课程项
 */
function calculateStatusAndTime(classItem: ResultClassItem): void {
  const now = new Date();
  const [startHour, startMinute] = classItem.startTime.split(':').map(Number);
  const [endHour, endMinute] = classItem.endTime.split(':').map(Number);
  
  const startDate = new Date();
  startDate.setHours(startHour, startMinute, 0, 0);
  
  const endDate = new Date();
  endDate.setHours(endHour, endMinute, 0, 0);
  
  if (now < startDate) {
    // 课程尚未开始
    classItem.status = 'prepare';
    const diffMs = startDate.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    classItem.time = `${diffHours}时${diffMinutes}分`;
  } else if (now > endDate) {
    // 课程已经结束
    classItem.status = 'ended';
    classItem.time = '0';
  } else {
    // 课程正在进行中
    classItem.status = 'ongoing';
    const diffMs = endDate.getTime() - now.getTime();
    const diffMinutes = Math.ceil(diffMs / (1000 * 60));
    classItem.time = diffMinutes.toString();
  }
}
export default getClassSchedule;