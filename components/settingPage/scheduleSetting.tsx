import DatePickerSheet from "@/components/BottomPicker/DatePickerSheet";
import WeekPicker from "@/components/BottomPicker/WeekPicker";
import SettingBar from "@/components/settingBar";
import SettingCard from "@/components/settingCard";
import { SwitchColors } from "@/constants/theme";
import { useGlobalState } from "@/state/GlobalState.js";
import { requestPermissions } from "@/utils/notificationService";
import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import { Alert, Switch } from "react-native";

export default function ScheduleSetting() {
  const navigation = useNavigation();
  const { state, dispatch } = useGlobalState();
  const activeSchedule =
    (state as any).schedules.find(
      (s: any) => s.id === (state as any).activeScheduleId
    ) ?? (state as any).schedules[0];
  const notificationSettings = (state as any).notificationSettings ?? {
    classReminder: false,
    dailyDigest: false,
  };

  const [circleVisible, setCircleVisible] = useState(false);
  const [timeSelectVisible, setTimeSelectVisible] = useState(false);

  function goToJsonImport() {
    navigation.navigate("jsonImport" as never);
  }
  function goToTimeLabelSetting() {
    navigation.navigate("timeLabelSetting" as never);
  }
  function goToCourseEdit() {
    navigation.navigate("courseEdit" as never);
  }
  function goToScheduleSwitch() {
    navigation.navigate("scheduleSwitch" as never);
  }

  async function handleNotificationToggle(
    key: "classReminder" | "dailyDigest",
    value: boolean
  ) {
    // 开启时检查权限
    if (value) {
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert(
          "通知权限未开启",
          "请前往系统设置 > 通知，为本 App 开启通知权限后再试。",
          [{ text: "知道了", style: "cancel" }]
        );
        return; // 不更新 state，Toggle 保持关闭
      }
    }

    const newSettings = { ...notificationSettings, [key]: value };
    dispatch({ type: "SET_NOTIFICATION_SETTINGS", payload: newSettings });
  }

  return (
    <>
      <SettingCard title="课表设置">
        <SettingBar
          title={"课表切换"}
          detail={"管理多个课表"}
          value={""}
          borderon={false}
          onPress={() => {
            goToScheduleSwitch();
          }}
        />
        <SettingBar
          title={"本学期总周数"}
          detail={"设置本学期总周数"}
          value={(activeSchedule as any).schedulePeriod[1].toString()}
          onPress={() => setCircleVisible(true)}
        />
        <SettingBar
          title={"开始上课时间"}
          detail={"设置开始上课时间"}
          value={`${(activeSchedule as any).startDate[0]}-${
            (activeSchedule as any).startDate[1] + 1
          }-${(activeSchedule as any).startDate[2]}`}
          onPress={() => {
            setTimeSelectVisible(true);
          }}
        />
        <SettingBar
          title={"课程时间设置"}
          detail={"设置每节课的上下课时间"}
          value={""}
          onPress={() => {
            goToTimeLabelSetting();
          }}
        />
        <SettingBar
          title={"课表编辑"}
          detail={"添加、编辑、删除课程"}
          value={""}
          onPress={() => {
            goToCourseEdit();
          }}
        />
      </SettingCard>

      <SettingCard title="通知设置">
        <SettingBar
          title="上课通知"
          detail="上课前10分钟提醒"
          rightElement={
            <Switch
              value={notificationSettings.classReminder}
              onValueChange={(v: boolean) =>
                handleNotificationToggle("classReminder", v)
              }
              trackColor={{
                false: SwitchColors.trackInactive,
                true: SwitchColors.trackActive,
              }}
              thumbColor={
                notificationSettings.classReminder
                  ? SwitchColors.thumbActive
                  : SwitchColors.thumbInactive
              }
            />
          }
          borderon={true}
        />
        <SettingBar
          title="明日课程通知"
          detail="每晚9点推送次日课程"
          rightElement={
            <Switch
              value={notificationSettings.dailyDigest}
              onValueChange={(v: boolean) =>
                handleNotificationToggle("dailyDigest", v)
              }
              trackColor={{
                false: SwitchColors.trackInactive,
                true: SwitchColors.trackActive,
              }}
              thumbColor={
                notificationSettings.dailyDigest
                  ? SwitchColors.thumbActive
                  : SwitchColors.thumbInactive
              }
            />
          }
          borderon={false}
        />
      </SettingCard>

      <WeekPicker
        visible={circleVisible}
        value={(activeSchedule as any).schedulePeriod[1]}
        onConfirm={(week) => {
          setCircleVisible(false);
          dispatch({ type: "SET_SCHEDULE_PERIOD", payload: [0, week] });
        }}
        onCancel={() => setCircleVisible(false)}
      />
      <DatePickerSheet
        visible={timeSelectVisible}
        value={
          new Date(
            (activeSchedule as any).startDate[0],
            (activeSchedule as any).startDate[1],
            (activeSchedule as any).startDate[2]
          )
        }
        minDate={new Date(new Date().getFullYear() - 1, 0, 1)}
        maxDate={new Date(new Date().getFullYear() + 1, 11, 31)}
        onConfirm={(date) => {
          setTimeSelectVisible(false);
          dispatch({
            type: "SET_START_DATE",
            payload: [date.getFullYear(), date.getMonth(), date.getDate()],
          });
        }}
        onCancel={() => setTimeSelectVisible(false)}
      />
    </>
  );
}
