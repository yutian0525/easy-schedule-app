import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ---- 类型定义（与 GlobalState / utils 保持一致）----

interface TimeLabelItem {
  label: string;
  from: string;   // "HH:MM"
  to: string;     // "HH:MM"
  time: 'morning' | 'afternoon' | 'night';
}

interface ClassItem {
  uid: string;
  className: string;
  week: number;      // 星期几 1-7（1=周一）
  mounth: number[];  // 上课教学周列表（历史拼写保留）
  time: number[];    // [开始节次, 结束节次] 1-based
  classRoom: string;
  [key: string]: any;
}

interface Schedule {
  id: string;
  schedulePeriod: [number, number]; // [minWeek, maxWeek]
  startDate: [number, number, number]; // [year, month, day]，month 0-based
  timeLabelList: TimeLabelItem[];
  myClassList: ClassItem[];
}

interface NotificationSettings {
  classReminder: boolean;
  dailyDigest: boolean;
}

interface AppState {
  schedules: Schedule[];
  activeScheduleId: string;
  notificationSettings: NotificationSettings;
}

// ---- 工具函数 ----

/**
 * 与 getCurrentWeekInfo 逻辑一致，但接受任意目标日期而非 new Date()。
 * 返回 targetDate 相对于学期开始日期的 { weekNum, weekday }。
 */
function getDateWeekInfo(
  semesterStart: Date,
  targetDate: Date
): { weekNum: number; weekday: number } {
  const start = new Date(semesterStart);
  start.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);

  // 目标日期早于学期开始日，直接返回 weekNum=0（会被 minWeek 过滤）
  if (target.getTime() < start.getTime()) {
    const weekday = target.getDay() === 0 ? 7 : target.getDay();
    return { weekNum: 0, weekday };
  }

  const dayDiff = Math.floor((target.getTime() - start.getTime()) / (1000 * 3600 * 24));
  const startDayOfWeek = start.getDay() === 0 ? 7 : start.getDay();
  const adjustedDayDiff = dayDiff + (startDayOfWeek - 1);
  const weekNum = Math.ceil((adjustedDayDiff + 1) / 7);
  const weekday = target.getDay() === 0 ? 7 : target.getDay();

  return { weekNum, weekday };
}

/** 解析 "HH:MM" 字符串，返回 { h, m } */
function parseTime(timeStr: string): { h: number; m: number } {
  const [h, m] = timeStr.split(':').map(Number);
  return { h, m };
}

/** 获取 targetDate 当天指定时刻的 Date 对象 */
function dateAtTime(targetDate: Date, h: number, m: number, s = 0): Date {
  const d = new Date(targetDate);
  d.setHours(h, m, s, 0);
  return d;
}

// ---- 公开 API ----

/** 向用户申请通知权限，返回是否已授权 */
export async function requestPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
  return status === 'granted';
}

/** 取消全部待推送的本地通知 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * 核心入口：取消所有旧通知，根据当前 state 重新调度接下来7天的通知。
 * 当两个开关均关闭时直接 cancel 并返回。
 */
export async function rescheduleAll(state: AppState): Promise<void> {
  const { notificationSettings, schedules, activeScheduleId } = state;

  // 两开关均关闭，直接清理
  if (!notificationSettings.classReminder && !notificationSettings.dailyDigest) {
    await cancelAllNotifications();
    return;
  }

  const schedule = schedules.find(s => s.id === activeScheduleId) ?? schedules[0];
  if (!schedule) return;

  const { myClassList, timeLabelList, startDate, schedulePeriod } = schedule;
  const semesterStart = new Date(startDate[0], startDate[1], startDate[2]);
  const [minWeek, maxWeek] = schedulePeriod;

  await cancelAllNotifications();

  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  const todayMidnight = new Date(now);
  todayMidnight.setHours(0, 0, 0, 0);

  for (let i = 0; i < 7; i++) {
    const targetDate = new Date(todayMidnight.getTime() + i * msPerDay);
    const { weekNum, weekday } = getDateWeekInfo(semesterStart, targetDate);

    // 该日在学期范围内才处理上课提醒
    if (weekNum >= minWeek && weekNum <= maxWeek) {
      const dayClasses = myClassList.filter(
        c => c.week === weekday && c.mounth.includes(weekNum)
      );

      if (notificationSettings.classReminder) {
        for (const cls of dayClasses) {
          const slotIndex = cls.time[0] - 1;
          if (slotIndex < 0 || slotIndex >= timeLabelList.length) continue;

          const { h, m } = parseTime(timeLabelList[slotIndex].from);
          // setHours 支持负分钟数，会自动借位（如 setHours(8, -5) = 07:55）
          const notifTime = dateAtTime(targetDate, h, m - 10);

          if (notifTime > now) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: '即将上课',
                body: `《${cls.className}》10分钟后开始 · ${cls.classRoom}`,
                data: { target: 'index' },
                sound: true,
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: notifTime,
                ...(Platform.OS === 'android' ? { channelId: 'schedule' } : {}),
              } as any,
            });
          }
        }
      }
    }

    // 明日课程摘要：在当天21:00推送，内容为明日课程
    if (notificationSettings.dailyDigest) {
      const digestTime = dateAtTime(targetDate, 21, 0);
      if (digestTime > now) {
        const tomorrowDate = new Date(targetDate.getTime() + msPerDay);
        const { weekNum: tmrWeekNum, weekday: tmrWeekday } = getDateWeekInfo(semesterStart, tomorrowDate);

        let tomorrowCount = 0;
        if (tmrWeekNum >= minWeek && tmrWeekNum <= maxWeek) {
          tomorrowCount = myClassList.filter(
            c => c.week === tmrWeekday && c.mounth.includes(tmrWeekNum)
          ).length;
        }

        const body =
          tomorrowCount > 0
            ? `明天有 ${tomorrowCount} 节课，点击查看`
            : '明天没有课，好好休息！';

        await Notifications.scheduleNotificationAsync({
          content: {
            title: '明日课程',
            body,
            data: { target: 'weekschedule' },
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: digestTime,
            ...(Platform.OS === 'android' ? { channelId: 'schedule' } : {}),
          } as any,
        });
      }
    }
  }
}
