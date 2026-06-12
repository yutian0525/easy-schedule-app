import { TimeLabelColors } from "@/constants/theme";
import { useGlobalState } from "@/state/GlobalState";
import TimePicker from "@/components/BottomPicker/TimePicker";
import AntDesign from "@expo/vector-icons/AntDesign";
import * as Clipboard from "expo-clipboard";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type SectionKey = "morning" | "afternoon" | "night";

type TimeLabelItem = {
  label: string;
  from: string;
  to: string;
  time: SectionKey;
};

type EditTarget = { section: SectionKey; index: number; field: "from" | "to" };

const SECTION_CONFIG: Record<
  SectionKey,
  { name: string; dot: string; defaultFrom: string }
> = {
  morning: {
    name: "上午",
    dot: TimeLabelColors.dotMorning,
    defaultFrom: "08:00",
  },
  afternoon: {
    name: "下午",
    dot: TimeLabelColors.dotAfternoon,
    defaultFrom: "13:00",
  },
  night: { name: "晚上", dot: TimeLabelColors.dotNight, defaultFrom: "18:00" },
};


const AI_PROMPT = `我会提供我学校的课程时间安排（截图或文字），请根据以下要求生成时间标签 JSON 数组，用于导入课程表 App。

格式要求：
- JSON 数组，每项包含 label（节次编号字符串）、from（开始时间）、to（结束时间）、time（时段）
- time 只能是 "morning"（上午）、"afternoon"（下午）、"night"（晚上）之一
- 时间格式为 "HH:MM"（24小时制，如 "08:00"）
- label 从 "1" 开始顺序编号

格式示例：
[
  {"label":"1","from":"08:00","to":"08:45","time":"morning"},
  {"label":"2","from":"08:55","to":"09:40","time":"morning"},
  {"label":"5","from":"13:30","to":"14:15","time":"afternoon"},
  {"label":"9","from":"19:00","to":"19:45","time":"night"}
]

请根据我提供的课程时间安排，识别每节课的上下课时间和所属时段，生成完整的 JSON 数组，直接输出 JSON，不要包含任何说明文字。`;

function addMinutes(timeStr: string, mins: number): string {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + mins;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

export default function TimeLabelSetting() {
  const { state, dispatch } = useGlobalState() as {
    state: any;
    dispatch: (action: { type: string; payload: any }) => void;
  };
  const activeSchedule = (state as any).schedules.find((s: any) => s.id === (state as any).activeScheduleId) ?? (state as any).schedules[0];

  const [sections, setSections] = useState<Record<SectionKey, TimeLabelItem[]>>(
    () => ({
      morning: activeSchedule.timeLabelList.filter(
        (t: TimeLabelItem) => t.time === "morning"
      ),
      afternoon: activeSchedule.timeLabelList.filter(
        (t: TimeLabelItem) => t.time === "afternoon"
      ),
      night: activeSchedule.timeLabelList.filter(
        (t: TimeLabelItem) => t.time === "night"
      ),
    })
  );

  const [pickerVisible, setPickerVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [copied, setCopied] = useState(false);
  const [jsonModalVisible, setJsonModalVisible] = useState(false);
  const [jsonInputText, setJsonInputText] = useState("");

  function saveWithRelabeling(next: Record<SectionKey, TimeLabelItem[]>) {
    const merged = [...next.morning, ...next.afternoon, ...next.night].map(
      (item, i) => ({ ...item, label: String(i + 1) })
    );
    dispatch({ type: "SET_TIME_LABEL_LIST", payload: merged });
  }

  async function copyPrompt() {
    await Clipboard.setStringAsync(AI_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function openImportModal() {
    setJsonInputText("");
    setJsonModalVisible(true);
  }

  async function pasteFromClipboard() {
    const text = await Clipboard.getStringAsync();
    setJsonInputText(text);
  }

  function importFromText() {
    try {
      const jsonMatch = jsonInputText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error();
      const data = JSON.parse(jsonMatch[0]) as TimeLabelItem[];
      if (!Array.isArray(data) || data.length === 0) throw new Error();
      for (const item of data) {
        if (
          !item.from ||
          !item.to ||
          !["morning", "afternoon", "night"].includes(item.time)
        )
          throw new Error();
      }
      const labeled = data.map((item, i) => ({
        ...item,
        label: String(i + 1),
      }));
      const next: Record<SectionKey, TimeLabelItem[]> = {
        morning: labeled.filter((t) => t.time === "morning"),
        afternoon: labeled.filter((t) => t.time === "afternoon"),
        night: labeled.filter((t) => t.time === "night"),
      };
      setSections(next);
      saveWithRelabeling(next);
      setJsonModalVisible(false);
      setJsonInputText("");
      Alert.alert("导入成功", `已导入 ${data.length} 条时间标签`);
    } catch {
      Alert.alert("格式错误", "请确认输入的是有效的时间标签 JSON 数组");
    }
  }

  function openPicker(
    section: SectionKey,
    index: number,
    field: "from" | "to"
  ) {
    setEditTarget({ section, index, field });
    setPickerVisible(true);
  }

  function onPickerOk(time: string) {
    if (!editTarget) return;
    const { section, index, field } = editTarget;
    const next = {
      ...sections,
      [section]: sections[section].map((item, i) =>
        i === index ? { ...item, [field]: time } : item
      ),
    };
    setSections(next);
    saveWithRelabeling(next);
    setPickerVisible(false);
  }

  function deleteRow(section: SectionKey, index: number) {
    const next = {
      ...sections,
      [section]: sections[section].filter((_, i) => i !== index),
    };
    setSections(next);
    saveWithRelabeling(next);
  }

  function addRow(section: SectionKey) {
    const list = sections[section];
    const lastTo =
      list.length > 0
        ? list[list.length - 1].to
        : SECTION_CONFIG[section].defaultFrom;
    const newItem: TimeLabelItem = {
      label: "",
      from: addMinutes(lastTo, 5),
      to: addMinutes(addMinutes(lastTo, 5), 45),
      time: section,
    };
    const next = { ...sections, [section]: [...list, newItem] };
    setSections(next);
    saveWithRelabeling(next);
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        {/* AI 生成提示卡片 */}
        <View style={styles.aiCard}>
          <View style={styles.aiCardHeader}>
            <View style={styles.aiIconWrap}>
              <AntDesign name="thunderbolt" size={16} color="#6454ab" />
            </View>
            <Text style={styles.aiTitle}>AI 生成</Text>
          </View>
          <Text style={styles.aiDesc}>
            复制提示词，连同课程时间安排截图或文字一起发给 AI，将返回的 JSON
            粘贴导入
          </Text>
          <View style={styles.aiSteps}>
            {["复制提示词", "附截图发 AI", "粘贴 JSON"].map((step, i) => (
              <View key={i} style={styles.aiStep}>
                <View style={styles.aiStepDot}>
                  <Text style={styles.aiStepNum}>{i + 1}</Text>
                </View>
                <Text style={styles.aiStepText}>{step}</Text>
                {i < 2 && (
                  <AntDesign
                    name="right"
                    size={10}
                    color="#C5BBE8"
                    style={{ marginHorizontal: 2 }}
                  />
                )}
              </View>
            ))}
          </View>
          <View style={styles.aiActions}>
            <TouchableOpacity
              style={styles.aiCopyBtn}
              onPress={copyPrompt}
              activeOpacity={0.75}
            >
              <AntDesign
                name={copied ? "check" : "copy"}
                size={14}
                color={copied ? "#2d6a4f" : "#6454ab"}
              />
              <Text
                style={[
                  styles.aiCopyBtnText,
                  copied && styles.aiCopyBtnTextDone,
                ]}
              >
                {copied ? "已复制" : "复制提示词"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.aiImportBtn}
              onPress={openImportModal}
              activeOpacity={0.75}
            >
              <AntDesign name="download" size={14} color="#FFFFFF" />
              <Text style={styles.aiImportBtnText}>粘贴 JSON 导入</Text>
            </TouchableOpacity>
          </View>
        </View>

        {(["morning", "afternoon", "night"] as SectionKey[]).map(
          (sectionKey) => {
            const config = SECTION_CONFIG[sectionKey];
            const items = sections[sectionKey];
            return (
              <View key={sectionKey} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.headerLeft}>
                    <View
                      style={[styles.dot, { backgroundColor: config.dot }]}
                    />
                    <Text style={styles.sectionName}>{config.name}</Text>
                    <Text style={styles.sectionCount}>{items.length}节</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => addRow(sectionKey)}
                  >
                    <AntDesign name="plus" size={12} color="#6454ab" />
                    <Text style={styles.addBtnText}>添加</Text>
                  </TouchableOpacity>
                </View>

                {items.map((item, index) => (
                  <View
                    key={index}
                    style={[
                      styles.row,
                      index < items.length - 1 && styles.rowBorder,
                    ]}
                  >
                    <View style={styles.labelPill}>
                      <Text style={styles.labelText}>第{item.label}节</Text>
                    </View>
                    <View style={styles.timePair}>
                      <TouchableOpacity
                        style={styles.timeChip}
                        onPress={() => openPicker(sectionKey, index, "from")}
                      >
                        <Text style={styles.timeText}>{item.from}</Text>
                      </TouchableOpacity>
                      <Text style={styles.separator}>—</Text>
                      <TouchableOpacity
                        style={styles.timeChip}
                        onPress={() => openPicker(sectionKey, index, "to")}
                      >
                        <Text style={styles.timeText}>{item.to}</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      onPress={() => deleteRow(sectionKey, index)}
                    >
                      <AntDesign name="delete" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            );
          }
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <TimePicker
        visible={pickerVisible}
        value={
          editTarget
            ? sections[editTarget.section][editTarget.index][editTarget.field]
            : '08:00'
        }
        onConfirm={(time) => onPickerOk(time)}
        onCancel={() => setPickerVisible(false)}
      />

      <Modal
        visible={jsonModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setJsonModalVisible(false)}
      >
        {/* 背景遮罩：绝对定位覆盖全屏，不受键盘影响 */}
        <View style={styles.modalBackdrop} />
        {/* 键盘感知层：仅负责把卡片顶起来 */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "padding"}
          style={styles.modalOverlay}
        >
          {/* 点击遮罩区域关闭弹窗 */}
          <Pressable style={{ flex: 1 }} onPress={() => setJsonModalVisible(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>粘贴 JSON 数据</Text>
              <TouchableOpacity onPress={() => setJsonModalVisible(false)}>
                <AntDesign name="close" size={20} color="#575757" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalHint}>
              将 AI 返回的 JSON 粘贴到下方，或点击从剪贴板读取
            </Text>
            <TextInput
              style={styles.modalInput}
              multiline
              value={jsonInputText}
              onChangeText={setJsonInputText}
              placeholder={
                '[{"label":"1","from":"08:00","to":"08:45","time":"morning"},...]'
              }
              placeholderTextColor="#C5C5C5"
              autoFocus
            />
            <TouchableOpacity
              style={styles.modalPasteBtn}
              onPress={pasteFromClipboard}
            >
              <AntDesign name="copy" size={13} color="#6454ab" />
              <Text style={styles.modalPasteBtnText}>从剪贴板粘贴</Text>
            </TouchableOpacity>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setJsonModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={importFromText}
              >
                <Text style={styles.modalConfirmText}>导入</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F4F8" },
  scrollView: { flex: 1 },
  content: { padding: 16, gap: 16 },

  // AI 卡片
  aiCard: {
    backgroundColor: "#F0EDFA",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDD6F5",
    padding: 16,
    gap: 12,
  },
  aiCardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  aiIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#EDE9F7",
    alignItems: "center",
    justifyContent: "center",
  },
  aiTitle: { fontSize: 15, fontWeight: "700", color: "#3D2D8A" },
  aiDesc: { fontSize: 13, color: "#5A4A8A", lineHeight: 19 },
  aiSteps: { flexDirection: "row", alignItems: "center" },
  aiStep: { flexDirection: "row", alignItems: "center", gap: 4 },
  aiStepDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#6454ab",
    alignItems: "center",
    justifyContent: "center",
  },
  aiStepNum: { fontSize: 10, fontWeight: "700", color: "#FFFFFF" },
  aiStepText: { fontSize: 11, color: "#5A4A8A" },
  aiActions: { flexDirection: "row", gap: 10 },
  aiCopyBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: "#6454ab",
    borderRadius: 8,
    paddingVertical: 9,
  },
  aiCopyBtnText: { fontSize: 13, fontWeight: "600", color: "#6454ab" },
  aiCopyBtnTextDone: { color: "#2d6a4f" },
  aiImportBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#6454ab",
    borderRadius: 8,
    paddingVertical: 9,
  },
  aiImportBtnText: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },

  // 节次卡片
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  sectionName: { fontSize: 15, fontWeight: "600", color: "#1A1A2E" },
  sectionCount: { fontSize: 12, color: "#A5A5A5" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EDE9F7",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  addBtnText: { fontSize: 12, fontWeight: "500", color: "#6454ab" },
  row: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "#F7F7F7" },
  labelPill: {
    backgroundColor: "#F4F4F8",
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  labelText: { fontSize: 12, fontWeight: "500", color: "#575757" },
  timePair: { flexDirection: "row", alignItems: "center", gap: 6 },
  timeChip: {
    backgroundColor: TimeLabelColors.chipBg,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  timeText: {
    fontSize: 14,
    fontWeight: "600",
    color: TimeLabelColors.chipText,
  },
  separator: { fontSize: 13, color: "#CCCCCC" },

  // JSON 导入弹窗
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 14,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A2E" },
  modalHint: { fontSize: 13, color: "#7A7A9A", lineHeight: 18 },
  modalInput: {
    height: 160,
    borderWidth: 1,
    borderColor: "#E0D9F5",
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: "#1A1A2E",
    textAlignVertical: "top",
    backgroundColor: "#FAFAFA",
  },
  modalPasteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#DDD6F5",
    borderRadius: 8,
  },
  modalPasteBtnText: { fontSize: 13, color: "#6454ab" },
  modalActions: { flexDirection: "row", gap: 10, paddingBottom: 8 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E0D9F5",
    alignItems: "center",
  },
  modalCancelText: { fontSize: 15, color: "#7A7A9A", fontWeight: "500" },
  modalConfirmBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#6454ab",
    alignItems: "center",
  },
  modalConfirmText: { fontSize: 15, color: "#FFFFFF", fontWeight: "600" },
});
