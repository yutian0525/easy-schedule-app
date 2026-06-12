import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GlobalStateProvider, useGlobalState } from '@/state/GlobalState.js';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Provider } from '@ant-design/react-native';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { rescheduleAll } from '@/utils/notificationService';

// 控制通知在前台（App 开着时）的展示行为
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * 内部组件：需在 GlobalStateProvider 内部才能调用 useGlobalState。
 * 职责：① 创建 Android 通知渠道 ② 监听 state 变化触发重调度 ③ 处理通知点击跳页。
 */
function NotificationInitializer() {
  const { state } = useGlobalState() as { state: any; dispatch: any };
  const activeSchedule = state.schedules.find((s: any) => s.id === state.activeScheduleId);

  // Android 通知渠道：只需创建一次（重复调用是幂等的）
  useEffect(() => {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('schedule', {
        name: '课表提醒',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      }).catch(e => console.error('Failed to create notification channel:', e));
    }
  }, []);

  // 当通知设置或课表关键数据变化时重调度
  useEffect(() => {
    if (!state.isHydrated) return;
    rescheduleAll(state).catch(e => console.error('rescheduleAll failed:', e));
  }, [
    state.isHydrated,
    state.notificationSettings,
    state.activeScheduleId,
    activeSchedule?.myClassList,
    activeSchedule?.timeLabelList,
    activeSchedule?.startDate,
    activeSchedule?.schedulePeriod,
  ]);

  // 通知点击跳页
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const target = response.notification.request.content.data?.target;
      if (target === 'index') router.replace('/(tabs)/' as any);
      if (target === 'weekschedule') router.replace('/(tabs)/weekschedule' as any);
    });
    return () => sub.remove();
  }, []);

  // 进入前台时补充刷新7天窗口（防止 app 长时间不操作导致通知失效）
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && stateRef.current.isHydrated) {
        rescheduleAll(stateRef.current).catch(e => console.error('rescheduleAll failed (foreground):', e));
      }
    });
    return () => sub.remove();
  }, []);

  return null;
}

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  return (
    <Provider>
      <GlobalStateProvider>
        <NotificationInitializer />
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack style={{ paddingTop: insets.top }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="jsonImport" options={{ presentation: 'modal', title: '导入JSON课表数据' }} />
            <Stack.Screen name="timeLabelSetting" options={{ title: '课程时间设置' }} />
            <Stack.Screen name="courseEdit" options={{ title: '课表编辑' }} />
            <Stack.Screen name="scheduleSwitch" options={{ title: '课表切换' }} />
            <Stack.Screen name="about" options={{ title: '关于简白课表' }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </GlobalStateProvider>
    </Provider>
  );
}
