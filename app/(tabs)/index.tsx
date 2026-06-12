import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, ScrollView, Text, View, Pressable } from 'react-native';
import DailyClassCard from "@/components/DailyClassCard";
import ClassDetailModal from "@/components/ClassDetailModal";
import AntDesign from '@expo/vector-icons/AntDesign';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import getClassSchedule from "@/utils/getClassSchedule";
import { getCurrentWeekInfo } from "@/utils/getCurrentWeekInfo.js";
import { useGlobalState } from '@/state/GlobalState.js';

export function empty(classes) {
  if (classes.length === 0) {
    <Text style={{ textAlign: 'center', fontSize: 16, marginTop: 20, marginBottom: 20, color: '#808080' }}>无课程</Text>
  }
}


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

  const weekday = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const [date, setDate] = useState(() => getCurrentWeekInfo(new Date(activeSchedule.startDate[0], activeSchedule.startDate[1], activeSchedule.startDate[2])));
  const [dailyClassList, setDailyClassList] = useState<{}>({ "morning": [], "afternoon": [], "night": [] });

  function get() {
    const r = getCurrentWeekInfo(new Date(displaySchedule.startDate[0], displaySchedule.startDate[1], displaySchedule.startDate[2]))
    const result = getClassSchedule(displaySchedule.myClassList, r.day, r.week, displaySchedule.timeLabelList);
    setDate(r);
    setDailyClassList(result);
  }

  useEffect(() => {
    get();
    const interval = setInterval(() => {
      get();
    }, 30000);
    return () => clearInterval(interval);
  }, [displaySchedule.myClassList, displaySchedule.timeLabelList, displaySchedule.startDate]);

  useEffect(() => {
    if (!state.needUpdate.includes('index')) {
      get();
      dispatch({ type: 'SET_NEED_UPDATE', payload: [...state.needUpdate, 'index'] });
    }
  }, [state.needUpdate]);

  return (
    <View style={styles.pageWrapper}>
    <ScrollView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={[styles.header, secondSchedule ? styles.headerSpaceBetween : null]}>
        <Text style={secondSchedule ? styles.weekText : styles.weekTextCenter}>{date.month}月{date.date}日 第{date.week}周 {weekday[date.day]}</Text>
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
      <View style={styles.timeBody}>
        <Text style={styles.timeText}>上午课程</Text>
        {dailyClassList.morning.length > 0 ? (
          dailyClassList.morning.map((item: any) => (
            <DailyClassCard classInfo={item} key={item.id} onPress={setSelectedClass} />
          ))
        ) : (
          <Text style={{ textAlign: 'center', fontSize: 12, marginTop: 20, marginBottom: 20, color: '#808080' }}>无上午课程</Text>
        )}
        <Text style={styles.timeText}>下午课程</Text>
        {dailyClassList.afternoon.length > 0 ? (
          dailyClassList.afternoon.map((item: any) => (
            <DailyClassCard classInfo={item} key={item.id} onPress={setSelectedClass} />
          ))
        ) : (
          <Text style={{ textAlign: 'center', fontSize: 12, marginTop: 20, marginBottom: 20, color: '#808080' }}>无下午课程</Text>
        )}
        <Text style={styles.timeText}>晚上课程</Text>
        {dailyClassList.night.length > 0 ? (
          dailyClassList.night.map((item: any) => (
            <DailyClassCard classInfo={item} key={item.id} onPress={setSelectedClass} />
          ))
        ) : (
          <Text style={{ textAlign: 'center', fontSize: 12, marginTop: 20, marginBottom: 20, color: '#808080' }}>无晚上课程</Text>
        )}
      </View>
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
  container: {
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, marginTop: 10,
  },
  headerSpaceBetween: {
    justifyContent: 'space-between',
  },
  weekText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#575757',
  },
  weekTextCenter: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#575757',
    flex: 1,
    textAlign: 'center',
  },
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
  timeBody: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    paddingHorizontal: 25,
    paddingVertical: 15,
    marginTop: 10,
  },
  timeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#A5A5A5',
    marginTop: 10,
    marginLeft: 5,
  },
});
