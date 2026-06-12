import { Tabs, router } from 'expo-router';
import React, { useEffect, useRef } from 'react';


import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useGlobalState } from '@/state/GlobalState.js';


export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { state } = useGlobalState() as { state: any };
  const jumped = useRef(false);

  useEffect(() => {
    if (!state.isHydrated || jumped.current) return;
    jumped.current = true;
    if (state.defaultTab === 'weekschedule') {
      router.replace('/(tabs)/weekschedule' as any);
    }
  }, [state.isHydrated]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: '#A5A5A5',
        headerShown: false,
        tabBarStyle: {
          height: 65,
        },
        tabBarIconStyle: {
          width: 50,  // 控制 icon 容器宽度
          height: 50, // 控制 icon 容器高度
        }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '',
          tabBarIcon: ({ color }) => <AntDesign name="home" size={32} color={color} />,
        }}
      />
      <Tabs.Screen
        name="weekschedule"
        options={{
          title: '',
          tabBarIcon: ({ color }) => <AntDesign name="calendar" size={32} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '',
          tabBarIcon: ({ color }) => <AntDesign name="setting" size={32} color={color} />,
        }}
      />
    </Tabs>
  );
}
