import SettingBar from "@/components/settingBar";
import SettingCard from "@/components/settingCard";
import ScheduleSetting from "@/components/settingPage/scheduleSetting";
import { resetAllData, useGlobalState } from "@/state/GlobalState.js";
import { Picker } from "@ant-design/react-native";
import { useNavigation } from "@react-navigation/native";
import React, { useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useGlobalState() as {
    state: any;
    dispatch: (a: any) => void;
  };
  const activeSchedule =
    (state as any).schedules.find(
      (s: any) => s.id === (state as any).activeScheduleId
    ) ?? (state as any).schedules[0];
  const navigation = useNavigation();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerValue, setPickerValue] = useState([]);
  const [tabTooltipVisible, setTabTooltipVisible] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, right: 0 });
  const tabRowRef = useRef<View>(null);

  const defaultTab = state.defaultTab ?? "index";
  const TAB_OPTIONS = [
    { label: "日课程", value: "index" },
    { label: "周课表", value: "weekschedule" },
  ];
  const defaultTabLabel =
    TAB_OPTIONS.find((o) => o.value === defaultTab)?.label ?? "日课程";

  function openTabTooltip() {
    tabRowRef.current?.measureInWindow((_x, y, _w, height) => {
      setTooltipPos({ top: y + height + 4, right: 18 });
      setTabTooltipVisible(true);
    });
  }

  function goToJsonImport() {
    navigation.navigate("jsonImport");
  }

  function goToAbout() {
    navigation.navigate("about");
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ paddingTop: insets.top }}>
        <View style={{ justifyContent: "center", alignItems: "center" }}>
          <Text style={styles.topText}>设置</Text>
        </View>

        <SettingCard title="常规">
          <View ref={tabRowRef} collapsable={false}>
            <SettingBar
              title="默认启动页"
              detail="App 启动后进入的页面"
              value={defaultTabLabel}
              borderon={false}
              onPress={openTabTooltip}
            />
          </View>
        </SettingCard>

        <ScheduleSetting />

        <SettingCard title="关于">
          <SettingBar
            title="关于简白课表"
            detail="版本信息、功能介绍"
            value=""
            borderon={false}
            onPress={goToAbout}
          />
        </SettingCard>

        {__DEV__ && (<SettingCard title="开发者">
          <SettingBar
            title="重置localStorage"
            detail="重置localStorage"
            value=""
            onPress={() => resetAllData(dispatch)}
          />
          <SettingBar
            title="当前周期"
            detail="当前周期"
            value={`${activeSchedule.schedulePeriod[0]}-${activeSchedule.schedulePeriod[1]}`}
            onPress={() => setPickerVisible(true)}
          />
          <SettingBar
            title="当前起始日期"
            detail="当前起始日期"
            value={`${activeSchedule.startDate[0]}-${parseInt(activeSchedule.startDate[1]) + 1}-${activeSchedule.startDate[2]}`}
          />
          <SettingBar
            title="需要更新"
            detail="需要更新"
            value={JSON.stringify(state.needUpdate)}
          />
          <SettingBar
            title="timeLabelList"
            detail={JSON.stringify(activeSchedule.timeLabelList)}
            value=""
          />
          <SettingBar
            title="myClassList"
            detail={JSON.stringify(activeSchedule.myClassList)}
            value=""
          />
          <SettingBar
            title="JSON导入"
            detail="JSON导入"
            value=""
            borderon={false}
            onPress={goToJsonImport}
          />
        </SettingCard>)}

        <Picker
          data={[1, 2, 3, 4, 5].map((n) => ({ label: String(n), value: n }))}
          cols={1}
          visible={pickerVisible}
          value={pickerValue}
          onChange={(v) => setPickerValue(v as [])}
          onVisibleChange={(v) => setPickerVisible(v)}
          onOk={() => setPickerVisible(false)}
        />

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 默认启动页 tooltip */}
      <Modal
        visible={tabTooltipVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setTabTooltipVisible(false)}
      >
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={() => setTabTooltipVisible(false)}
        />
        <View
          style={[
            styles.tooltip,
            { top: tooltipPos.top, right: tooltipPos.right },
          ]}
        >
          {TAB_OPTIONS.map((opt, i) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.tooltipItem,
                i < TAB_OPTIONS.length - 1 && styles.tooltipDivider,
              ]}
              onPress={() => {
                dispatch({ type: "SET_DEFAULT_TAB", payload: opt.value });
                setTabTooltipVisible(false);
              }}
            >
              <Text
                style={[
                  styles.tooltipText,
                  defaultTab === opt.value && styles.tooltipTextActive,
                ]}
              >
                {opt.label}
              </Text>
              {defaultTab === opt.value && (
                <View style={styles.tooltipCheck} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  topText: {
    marginTop: 10,
    fontSize: 20,
    fontWeight: "bold",
    color: "#575757",
    marginBottom: 20,
  },
  tooltip: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    minWidth: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 10,
  },
  tooltipItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  tooltipDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F1",
  },
  tooltipText: {
    fontSize: 15,
    color: "#353535",
  },
  tooltipTextActive: {
    color: "#6454ab",
    fontWeight: "600",
  },
  tooltipCheck: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#6454ab",
    marginLeft: 8,
  },
});
