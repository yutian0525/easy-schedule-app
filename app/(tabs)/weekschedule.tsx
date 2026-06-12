import { StyleSheet, ScrollView, Text, View, Pressable, Animated, PanResponder } from 'react-native';
import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import AntDesign from '@expo/vector-icons/AntDesign';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import getWeekDates from '../../utils/oneWeekList';
import ScheduleClassCard from "@/components/ScheduleClassCard";
import ClassDetailModal from "@/components/ClassDetailModal";
import getWeeklySchedule from "../../utils/weekClassList";
import { useGlobalState } from '@/state/GlobalState.js';
import { getCurrentWeekInfo } from "@/utils/getCurrentWeekInfo.js";

interface PanelWeeks { prev: number; center: number; next: number; }

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useGlobalState();

  const activeSchedule = (state as any).schedules.find((s: any) => s.id === (state as any).activeScheduleId) ?? (state as any).schedules[0];
  const secondSchedule = (state as any).secondScheduleId
    ? (state as any).schedules.find((s: any) => s.id === (state as any).secondScheduleId) ?? null
    : null;

  const [isViewingSecond, setIsViewingSecond] = useState(false);
  const [peekSchedule, setPeekSchedule] = useState<any>(null);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const longPressRef = useRef(false);

  const displaySchedule = peekSchedule ?? (isViewingSecond && secondSchedule ? secondSchedule : activeSchedule);

  const todayInfo = getCurrentWeekInfo(new Date(displaySchedule.startDate[0], displaySchedule.startDate[1], displaySchedule.startDate[2])) as any;
  const todayWeek: number = todayInfo.week;
  const todayDayIndex: number = todayInfo.day - 1; // 0-based, 0=周一…4=周五; 5-6 不在5列格内

  const getInitialWeek = () =>
    getCurrentWeekInfo(new Date(activeSchedule.startDate[0], activeSchedule.startDate[1], activeSchedule.startDate[2])).week;

  const [weekNumber, setWeekNumber] = useState<number>(getInitialWeek);
  // 无限轮播：panelWeeks 记录三个 panel 各自展示哪一周
  const [panelWeeks, setPanelWeeks] = useState<PanelWeeks>(() => {
    const n = getInitialWeek();
    return { prev: n - 1, center: n, next: n + 1 };
  });
  const panelWeeksRef = useRef(panelWeeks);
  useEffect(() => { panelWeeksRef.current = panelWeeks; }, [panelWeeks]);

  const leftBarWidth = 32;
  const weekLabelHeight = 35;

  // useNativeDriver: false 保证 translateX.setValue 与 setState 在同一 JS 帧内提交，消除闪烁
  const translateX = useRef(new Animated.Value(0)).current;
  const [panelWidth, setPanelWidth] = useState(0);
  const panelWidthRef = useRef(0);

  // 动态计算格子高度：遍历主课表和第二课表所有课程，
  // 取 ceil(卡片最小容纳高度 / 节数) 的最大值，保证最拥挤的格子也能完整显示
  const classGridHeight = useMemo(() => {
    const allClasses = [
      ...(activeSchedule.myClassList || []),
      ...(secondSchedule ? (secondSchedule.myClassList || []) : []),
    ];
    if (allClasses.length === 0 || panelWidth === 0) return 70;

    // ScheduleClassCard 内部垂直空间：外层 padding 3*2 + paddingTop 12 + paddingBottom 12
    const CARD_PAD_V = 3 + 3 + 12 + 12;
    const LINE_H_CLASS = 12 * 1.35;   // className fontSize 12，行高估算
    const LINE_H_SMALL = 10.5 * 1.35; // location / teacher fontSize 10.5，行高估算
    const TEXT_MARGIN = 2;             // className / location 的 marginBottom

    // 每列可用文字宽度（卡片左右各 8px padding）
    const colW = (panelWidth - leftBarWidth) / 5;
    const textW = Math.max(10, colW - 16);
    // 每行能放几个汉字（汉字宽度 ≈ fontSize）
    const charsPerLine = Math.max(2, Math.floor(textW / 12));

    let maxRatio = 0;
    for (const cls of allClasses) {
      const slots = Math.max(1, (cls.time?.[1] ?? 1) - (cls.time?.[0] ?? 1) + 1);
      const nameLines = Math.max(1, Math.ceil((cls.className?.length ?? 1) / charsPerLine));
      const textH =
        nameLines * LINE_H_CLASS + TEXT_MARGIN +
        LINE_H_SMALL + TEXT_MARGIN +
        LINE_H_SMALL;
      const cardH = textH + CARD_PAD_V;
      maxRatio = Math.max(maxRatio, cardH / slots);
    }

    // 向上取整后加 4px 余量，最小不低于 50
    return Math.max(50, Math.ceil(maxRatio) + 4);
  }, [activeSchedule.myClassList, secondSchedule, panelWidth]);
  const weekNumberRef = useRef(weekNumber);
  const schedulePeriodRef = useRef<[number, number]>(displaySchedule.schedulePeriod);

  useEffect(() => { weekNumberRef.current = weekNumber; }, [weekNumber]);
  useEffect(() => { schedulePeriodRef.current = displaySchedule.schedulePeriod; }, [displaySchedule.schedulePeriod]);

  useEffect(() => {
    panelWidthRef.current = panelWidth;
    if (panelWidth > 0) translateX.setValue(-panelWidth);
  }, [panelWidth]);

  // resetXRef: 动画回调里只更新 state，不立即 setValue。
  // useLayoutEffect 在 React commit 阶段（native paint 之前）同步执行 setValue，
  // 此时会触发 Animated.View 的同步重渲染，保证 panels 内容与 translateX 在同一次 native paint 里生效。
  const resetXRef = useRef(false);
  useLayoutEffect(() => {
    if (resetXRef.current) {
      resetXRef.current = false;
      translateX.setValue(-panelWidthRef.current);
    }
  });

  const commitWeekRef = useRef((_direction: 'prev' | 'next') => {});
  commitWeekRef.current = (direction: 'prev' | 'next') => {
    resetXRef.current = true; // 交给 useLayoutEffect 在 paint 前原子重置
    const pw = panelWeeksRef.current;
    if (direction === 'next') {
      const nc = pw.next;
      setWeekNumber(nc);
      setPanelWeeks({ prev: pw.center, center: nc, next: nc + 1 });
    } else {
      const nc = pw.prev;
      setWeekNumber(nc);
      setPanelWeeks({ prev: nc - 1, center: nc, next: pw.center });
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5 && Math.abs(gs.dx) > 8,
      onPanResponderMove: (_, gs) => {
        const w = weekNumberRef.current;
        const [minW, maxW] = schedulePeriodRef.current;
        let dx = gs.dx;
        if (w <= minW && dx > 0) dx = 0;
        if (w >= maxW && dx < 0) dx = 0;
        translateX.setValue(-panelWidthRef.current + dx);
      },
      onPanResponderRelease: (_, gs) => {
        const pw = panelWidthRef.current;
        const w = weekNumberRef.current;
        const [minW, maxW] = schedulePeriodRef.current;
        if ((gs.dx > pw * 0.25 || gs.vx > 0.5) && w > minW) {
          Animated.timing(translateX, { toValue: 0, duration: 220, useNativeDriver: false }).start(() => {
            commitWeekRef.current('prev');
          });
        } else if ((gs.dx < -pw * 0.25 || gs.vx < -0.5) && w < maxW) {
          Animated.timing(translateX, { toValue: -2 * pw, duration: 220, useNativeDriver: false }).start(() => {
            commitWeekRef.current('next');
          });
        } else {
          Animated.spring(translateX, { toValue: -pw, useNativeDriver: false, tension: 100, friction: 8 }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, { toValue: -panelWidthRef.current, useNativeDriver: false }).start();
      },
    })
  ).current;

  function fresh() {
    const n = getCurrentWeekInfo(new Date(displaySchedule.startDate[0], displaySchedule.startDate[1], displaySchedule.startDate[2])).week;
    setWeekNumber(n);
    setPanelWeeks({ prev: n - 1, center: n, next: n + 1 });
    translateX.setValue(-panelWidthRef.current);
  }

  useEffect(() => {
    if (!state.needUpdate.includes('weekSchedule')) {
      fresh();
      dispatch({ type: 'SET_NEED_UPDATE', payload: [...state.needUpdate, 'weekSchedule'] });
    }
  }, [state.needUpdate]);

  useEffect(() => {
    fresh();
  }, [displaySchedule.myClassList, displaySchedule.timeLabelList, displaySchedule.startDate, displaySchedule.schedulePeriod]);

  function getTimeList(timelist: any[], timeStr: string) {
    return timelist.filter(time => time.time === timeStr);
  }

  function getPanelData(weekN: number) {
    const sd = displaySchedule.startDate;
    const [minW, maxW] = displaySchedule.schedulePeriod;
    if (weekN < minW || weekN > maxW) {
      return { classes: { morning: [] as any[], afternoon: [] as any[], night: [] as any[] }, weekDates: [] as any[] };
    }
    return {
      classes: getWeeklySchedule(displaySchedule.myClassList, weekN, displaySchedule.timeLabelList),
      weekDates: getWeekDates(new Date(sd[0], sd[1], sd[2]), weekN - 1, false),
    };
  }

  function renderSchedulePanel(weekN: number) {
    const w = panelWidth;
    const colW = w > 0 ? (w - leftBarWidth) / 5 : 0;
    const { classes, weekDates } = getPanelData(weekN);

    return (
      <View style={{ width: w }} key={weekN}>
        <View style={[styles.RowWeekItem, { height: weekLabelHeight }]}>
          <View style={{ width: leftBarWidth, height: weekLabelHeight }} />
          {weekDates.map((date: any, index: number) => {
            const isToday = weekN === todayWeek && index === todayDayIndex;
            return (
              <View key={index} style={[styles.classweekItem, { height: weekLabelHeight }]}>
                <Text style={[styles.weeksText, isToday && styles.todayWeekText]}>{date.day}</Text>
                <View style={[styles.dateCircle, isToday && styles.dateCircleToday]}>
                  <Text style={[styles.dateText, isToday && styles.dateTextToday]}>{date.date}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View>
          {getTimeList(displaySchedule.timeLabelList, 'morning').map((time: any, index: number) => (
            <View key={index} style={[styles.RowClassItem, { height: classGridHeight }]}>
              <View style={[styles.leftTimeBox, { width: leftBarWidth, height: classGridHeight }]}>
                <Text style={styles.timeLabelText}>{time.label}</Text>
                <Text style={styles.timeText}>{time.from}</Text>
                <Text style={styles.timeText}>{time.to}</Text>
              </View>
              {weekDates.map((_: any, idx: number) => (
                <View key={idx} style={[styles.classClassItem, { height: classGridHeight }]} />
              ))}
            </View>
          ))}
          {classes.morning.map((classInfo: any) => (
            <View key={classInfo.id} style={[styles.classPosition, {
              height: classGridHeight * (classInfo.fromTo[1] - classInfo.fromTo[0] + 1),
              width: colW, top: classGridHeight * (classInfo.fromTo[0] - 1),
              left: colW * (classInfo.week - 1) + leftBarWidth,
            }]}>
              <ScheduleClassCard classInfo={classInfo} onPress={setSelectedClass} />
            </View>
          ))}
        </View>

        <View style={styles.blankSpace}><Text style={styles.blankText}>午休</Text></View>

        <View>
          {getTimeList(displaySchedule.timeLabelList, 'afternoon').map((time: any, index: number) => (
            <View key={index} style={[styles.RowClassItem, { height: classGridHeight }]}>
              <View style={[styles.leftTimeBox, { width: leftBarWidth, height: classGridHeight }]}>
                <Text style={styles.timeLabelText}>{time.label}</Text>
                <Text style={styles.timeText}>{time.from}</Text>
                <Text style={styles.timeText}>{time.to}</Text>
              </View>
              {weekDates.map((_: any, idx: number) => (
                <View key={idx} style={[styles.classClassItem, { height: classGridHeight }]} />
              ))}
            </View>
          ))}
          {classes.afternoon.map((classInfo: any) => (
            <View key={classInfo.id} style={[styles.classPosition, {
              height: classGridHeight * (classInfo.fromTo[1] - classInfo.fromTo[0] + 1),
              width: colW, top: classGridHeight * (classInfo.fromTo[0] - 4 - 1),
              left: colW * (classInfo.week - 1) + leftBarWidth,
            }]}>
              <ScheduleClassCard classInfo={classInfo} onPress={setSelectedClass} />
            </View>
          ))}
        </View>

        <View style={styles.blankSpace}><Text style={styles.blankText}>晚休</Text></View>

        <View>
          {getTimeList(displaySchedule.timeLabelList, 'night').map((time: any, index: number) => (
            <View key={index} style={[styles.RowClassItem, { height: classGridHeight }]}>
              <View style={[styles.leftTimeBox, { width: leftBarWidth, height: classGridHeight }]}>
                <Text style={styles.timeLabelText}>{time.label}</Text>
                <Text style={styles.timeText}>{time.from}</Text>
                <Text style={styles.timeText}>{time.to}</Text>
              </View>
              {weekDates.map((_: any, idx: number) => (
                <View key={idx} style={[styles.classClassItem, { height: classGridHeight }]} />
              ))}
            </View>
          ))}
          {classes.night.map((classInfo: any) => (
            <View key={classInfo.id} style={[styles.classPosition, {
              height: classGridHeight * (classInfo.fromTo[1] - classInfo.fromTo[0] + 1),
              width: colW, top: classGridHeight * (classInfo.fromTo[0] - 8 - 1),
              left: colW * (classInfo.week - 1) + leftBarWidth,
            }]}>
              <ScheduleClassCard classInfo={classInfo} onPress={setSelectedClass} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.pageWrapper}>
      <ScrollView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={[styles.weekHeader, secondSchedule ? styles.weekHeaderSpaceBetween : null]}>
          <Pressable style={styles.weekNav} onPress={fresh}>
            <Text style={styles.weekText}>第{weekNumber}周</Text>
          </Pressable>
          {secondSchedule && (
            <Pressable
              style={[styles.switchChip, isViewingSecond && styles.switchChipActive]}
              onPress={() => setIsViewingSecond(prev => !prev)}
              onLongPress={() => { longPressRef.current = true; setPeekSchedule(secondSchedule); }}
              onPressOut={() => { if (longPressRef.current) { longPressRef.current = false; setPeekSchedule(null); } }}
              delayLongPress={400}
            >
              <AntDesign name="swap" size={13} color={isViewingSecond ? '#FFFFFF' : '#6454ab'} />
              <Text style={[styles.switchChipText, isViewingSecond && styles.switchChipTextActive]}>
                {(isViewingSecond ? secondSchedule : activeSchedule).name.slice(0, 5)}
              </Text>
            </Pressable>
          )}
        </View>

        <View
          style={styles.classGridContainer}
          onLayout={(e) => {
            const { width } = e.nativeEvent.layout;
            if (width > 0 && width !== panelWidth) setPanelWidth(width);
          }}
        >
          <Animated.View
            style={{ flexDirection: 'row', transform: [{ translateX }] }}
            {...panResponder.panHandlers}
          >
            {renderSchedulePanel(panelWeeks.prev)}
            {renderSchedulePanel(panelWeeks.center)}
            {renderSchedulePanel(panelWeeks.next)}
          </Animated.View>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
      {peekSchedule && (
        <View style={styles.peekBanner}>
          <Text style={styles.peekBannerText}>正在预览「{peekSchedule.name}」· 松手返回</Text>
        </View>
      )}
      <ClassDetailModal
        visible={!!selectedClass}
        classInfo={selectedClass}
        timeLabelList={displaySchedule.timeLabelList}
        onClose={() => setSelectedClass(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff' },
  weekText: {
    marginTop: 10, fontSize: 20, fontWeight: 'bold',
    justifyContent: 'center', color: '#575757',
  },
  weekHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, marginTop: 4,
  },
  weekHeaderSpaceBetween: { justifyContent: 'space-between' },
  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  switchChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#EDE9F7', borderRadius: 16,
    paddingVertical: 5, paddingHorizontal: 12,
  },
  switchChipActive: { backgroundColor: '#6454ab' },
  switchChipText: { fontSize: 12, fontWeight: '600', color: '#6454ab' },
  switchChipTextActive: { color: '#FFFFFF' },
  pageWrapper: { flex: 1 },
  peekBanner: {
    position: 'absolute', bottom: 16, left: 16, right: 16,
    backgroundColor: 'rgba(61, 45, 138, 0.88)',
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 8,
  },
  peekBannerText: { fontSize: 13, color: '#EDE9F7', fontWeight: '500' },
  classGridContainer: { marginTop: 10, overflow: 'hidden' },
  RowWeekItem: {
    flex: 1, justifyContent: 'flex-start', alignItems: 'flex-start',
    flexDirection: 'row', borderBottomColor: '#F7F7F7', borderBottomWidth: 0.6,
  },
  classweekItem: { flex: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'column' },
  weeksText: { fontSize: 14, fontWeight: 500, color: '#4C4C4C' },
  dateText: { fontSize: 10, fontWeight: 'normal', color: '#4C4C4C' },
  RowClassItem: {
    flex: 1, justifyContent: 'flex-start', alignItems: 'flex-start',
    flexDirection: 'row', borderBottomColor: '#F7F7F7', borderBottomWidth: 0.6,
  },
  classClassItem: { flex: 1, borderLeftWidth: 0.6, borderLeftColor: '#F7F7F7' },
  blankSpace: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    flexDirection: 'row', height: 25, backgroundColor: '#F7F7F7', borderRadius: 3,
  },
  blankText: { fontSize: 12, fontWeight: 400, color: '#C6C6C6' },
  leftTimeBox: { justifyContent: 'center', alignItems: 'center', flexDirection: 'column' },
  timeLabelText: { fontSize: 12, fontWeight: 600, color: '#000000' },
  timeText: { fontSize: 10, fontWeight: 400, color: '#C6C6C6' },
  classPosition: { position: 'absolute', padding: 3 },
  todayWeekText: { color: '#6454ab', fontWeight: '700' },
  dateCircle: { justifyContent: 'center', alignItems: 'center', minWidth: 18, borderRadius: 9, paddingHorizontal: 2 },
  dateCircleToday: { backgroundColor: '#6454ab' },
  dateTextToday: { color: '#FFFFFF', fontWeight: '700' },
});
