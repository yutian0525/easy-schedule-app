import { useGlobalState } from '@/state/GlobalState';
import AntDesign from '@expo/vector-icons/AntDesign';
import React, { useState } from 'react';
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
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SHARE_API_BASE } from '@/constants/api';

type Schedule = {
  id: string;
  name: string;
  schedulePeriod: [number, number];
  startDate: [number, number, number];
  timeLabelList: any[];
  myClassList: any[];
};

export default function ScheduleSwitch() {
  const { state, dispatch } = useGlobalState() as {
    state: any;
    dispatch: (action: { type: string; payload?: any }) => void;
  };

  const [menuSchedule, setMenuSchedule] = useState<Schedule | null>(null);
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [nameMode, setNameMode] = useState<'create' | 'rename'>('create');
  const [nameText, setNameText] = useState('');
  const [renameTarget, setRenameTarget] = useState<Schedule | null>(null);
  const [importCode, setImportCode] = useState('');
  const [importing, setImporting] = useState(false);
  const [shareCode, setShareCode] = useState('');
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [sharing, setSharing] = useState(false);

  function formatSubtitle(s: Schedule) {
    const [y, m, d] = s.startDate;
    return `第${s.schedulePeriod[0]}-${s.schedulePeriod[1]}周 · ${y}/${m + 1}/${d} · ${s.myClassList.length}节课`;
  }

  function openCreate() {
    setNameMode('create');
    setNameText('');
    setNameModalVisible(true);
  }

  function openRename(s: Schedule) {
    setMenuSchedule(null);
    setNameMode('rename');
    setNameText(s.name);
    setRenameTarget(s);
    setNameModalVisible(true);
  }

  function confirmName() {
    const name = nameText.trim() || (nameMode === 'create' ? '新课表' : renameTarget?.name ?? '');
    if (nameMode === 'create') {
      dispatch({ type: 'CREATE_SCHEDULE', payload: { name } });
    } else if (renameTarget) {
      dispatch({ type: 'RENAME_SCHEDULE', payload: { id: renameTarget.id, name } });
    }
    setNameModalVisible(false);
    setNameText('');
    setRenameTarget(null);
  }

  async function handleImport() {
    if (importCode.length !== 8) return;
    setImporting(true);
    try {
      const res = await fetch(`${SHARE_API_BASE}/import/${importCode}`);
      if (!res.ok) {
        Alert.alert('导入失败', '分享码无效或已过期');
        return;
      }
      const data = await res.json();
      if (!data || typeof data !== 'object' || !Array.isArray(data.myClassList)) {
        Alert.alert('导入失败', '服务端返回数据格式异常');
        return;
      }
      dispatch({ type: 'IMPORT_SCHEDULE', payload: data });
      setImportCode('');
      Alert.alert('导入成功', `课表「${data.name || '来自分享'}」已添加`);
    } catch {
      Alert.alert('导入失败', '网络错误，请检查连接');
    } finally {
      setImporting(false);
    }
  }

  async function handleShare(s: Schedule) {
    if (sharing) return;
    setMenuSchedule(null);
    setSharing(true);
    try {
      const res = await fetch(`${SHARE_API_BASE}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: s.name,
          schedulePeriod: s.schedulePeriod,
          startDate: s.startDate,
          timeLabelList: s.timeLabelList,
          myClassList: s.myClassList,
        }),
      });
      if (!res.ok) {
        Alert.alert('分享失败', '生成分享码失败，请重试');
        return;
      }
      const data = await res.json();
      if (!data || typeof data.code !== 'string' || data.code.length === 0) {
        Alert.alert('分享失败', '服务端返回数据格式异常');
        return;
      }
      setShareCode(data.code);
      setShareModalVisible(true);
    } catch {
      Alert.alert('分享失败', '网络错误，请检查连接');
    } finally {
      setSharing(false);
    }
  }

  function handleSwitchActive(id: string) {
    dispatch({ type: 'SWITCH_ACTIVE_SCHEDULE', payload: { id } });
  }

  function handleSetSecond(s: Schedule) {
    setMenuSchedule(null);
    dispatch({
      type: 'SET_SECOND_SCHEDULE',
      payload: { id: state.secondScheduleId === s.id ? null : s.id },
    });
  }

  function handleDelete(s: Schedule) {
    setMenuSchedule(null);
    Alert.alert('删除课表', `确认删除「${s.name}」？此操作不可恢复`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => dispatch({ type: 'DELETE_SCHEDULE', payload: { id: s.id } }),
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* 顶部导入区 */}
        <View style={styles.importRow}>
          <TextInput
            style={styles.importInput}
            placeholder="输入8位分享码"
            placeholderTextColor="#C5C5C5"
            value={importCode}
            onChangeText={(t) => setImportCode(t.replace(/\D/g, '').slice(0, 8))}
            keyboardType="numeric"
            maxLength={8}
          />
          <TouchableOpacity
            style={[styles.importBtn, (importCode.length !== 8 || importing) && styles.importBtnDisabled]}
            onPress={handleImport}
            disabled={importCode.length !== 8 || importing}
            activeOpacity={0.8}
          >
            <Text style={[styles.importBtnText, (importCode.length !== 8 || importing) && styles.importBtnTextDisabled]}>
              {importing ? '导入中' : '导入'}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sectionTitle}>我的课表</Text>

        {state.schedules.map((s: Schedule) => {
          const isActive = s.id === state.activeScheduleId;
          const isSecond = s.id === state.secondScheduleId;
          return (
            <TouchableOpacity
              key={s.id}
              style={styles.card}
              onPress={() => handleSwitchActive(s.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.colorBar, { backgroundColor: isActive ? '#6454ab' : '#E0E0E0' }]} />
              <View style={styles.cardInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.cardName}>{s.name}</Text>
                  {isActive && (
                    <View style={styles.badgeActive}>
                      <Text style={styles.badgeActiveText}>当前</Text>
                    </View>
                  )}
                  {isSecond && (
                    <View style={styles.badgeSecond}>
                      <Text style={styles.badgeSecondText}>第二</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardSub}>{formatSubtitle(s)}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setMenuSchedule(s)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <AntDesign name="ellipsis" size={20} color="#A5A5A5" />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}

        <Text style={styles.hint}>点击卡片切换课表，点 ··· 可重命名、设为第二课表或删除</Text>
        <View style={{ height: 40 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate} activeOpacity={0.85}>
          <AntDesign name="plus" size={18} color="#FFFFFF" />
          <Text style={styles.addBtnText}>新建课表</Text>
        </TouchableOpacity>
      </View>

      {/* 操作菜单 */}
      <Modal
        visible={menuSchedule !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setMenuSchedule(null)}
      >
        <View style={styles.modalBackdrop} />
        <Pressable style={styles.menuOverlay} onPress={() => setMenuSchedule(null)}>
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem} onPress={() => menuSchedule && openRename(menuSchedule)}>
              <AntDesign name="edit" size={16} color="#575757" />
              <Text style={styles.menuItemText}>重命名</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => menuSchedule && handleShare(menuSchedule)}>
              <AntDesign name="share-alt" size={16} color="#575757" />
              <Text style={styles.menuItemText}>{sharing ? '生成中…' : '分享课表'}</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => menuSchedule && handleSetSecond(menuSchedule)}>
              <AntDesign name="swap" size={16} color="#575757" />
              <Text style={styles.menuItemText}>
                {menuSchedule && state.secondScheduleId === menuSchedule.id ? '取消第二课表' : '设为第二课表'}
              </Text>
            </TouchableOpacity>
            {state.schedules.length > 1 && menuSchedule && (
              <>
                <View style={styles.menuDivider} />
                <TouchableOpacity style={styles.menuItem} onPress={() => handleDelete(menuSchedule)}>
                  <AntDesign name="delete" size={16} color="#FF3B30" />
                  <Text style={[styles.menuItemText, { color: '#FF3B30' }]}>删除课表</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* 命名弹窗（新建/重命名复用） */}
      <Modal
        visible={nameModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setNameModalVisible(false)}
      >
        <View style={styles.modalBackdrop} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
          style={styles.modalOverlay2}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setNameModalVisible(false)} />
          <View style={styles.nameCard}>
            <View style={styles.nameCardHeader}>
              <Text style={styles.nameCardTitle}>{nameMode === 'create' ? '新建课表' : '重命名'}</Text>
              <TouchableOpacity onPress={() => setNameModalVisible(false)}>
                <AntDesign name="close" size={20} color="#575757" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.nameInput}
              value={nameText}
              onChangeText={setNameText}
              placeholder={nameMode === 'create' ? '如：大三下学期' : '输入新名称'}
              placeholderTextColor="#C5C5C5"
              autoFocus
              maxLength={20}
            />
            <View style={styles.nameCardActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setNameModalVisible(false)}>
                <Text style={styles.cancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={confirmName}>
                <Text style={styles.confirmText}>{nameMode === 'create' ? '创建' : '确认'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 分享码展示 Modal */}
      <Modal
        visible={shareModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShareModalVisible(false)}
      >
        <View style={styles.modalBackdrop} />
        <Pressable style={styles.menuOverlay} onPress={() => setShareModalVisible(false)}>
          <View style={styles.shareCard}>
            <Text style={styles.shareCardTitle}>分享码</Text>
            <Text style={styles.shareCodeText}>{shareCode}</Text>
            <Text style={styles.shareCardHint}>24 小时内有效</Text>
            <View style={styles.shareCardActions}>
              <TouchableOpacity
                style={styles.copyBtn}
                activeOpacity={0.8}
                onPress={async () => {
                  await Clipboard.setStringAsync(shareCode);
                  Alert.alert('已复制', '分享码已复制到剪贴板');
                }}
              >
                <AntDesign name="copy" size={16} color="#FFFFFF" />
                <Text style={styles.copyBtnText}>复制分享码</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F4F8' },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 10 },
  sectionTitle: { fontSize: 12, color: '#A5A5A5', fontWeight: '500' },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 12, padding: 14, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  colorBar: { width: 4, height: 40, borderRadius: 2 },
  cardInfo: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardName: { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  badgeActive: { backgroundColor: '#EDE9F7', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeActiveText: { fontSize: 11, fontWeight: '600', color: '#6454ab' },
  badgeSecond: { backgroundColor: '#FFF0F1', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeSecondText: { fontSize: 11, fontWeight: '600', color: '#D48D95' },
  cardSub: { fontSize: 12, color: '#A5A5A5' },
  hint: { fontSize: 11, color: '#C5C5C5', textAlign: 'center', marginTop: 8 },
  bottomBar: {
    height: 80, backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: '#EFEFEF',
    paddingHorizontal: 16, justifyContent: 'center',
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 48, borderRadius: 12, backgroundColor: '#6454ab',
  },
  addBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  menuOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  menuCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, minWidth: 220,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18, shadowRadius: 20, elevation: 12,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  menuItemText: { fontSize: 14, color: '#1A1A2E' },
  menuDivider: { height: 1, backgroundColor: '#F5F5F5', marginHorizontal: 16 },
  modalOverlay2: { flex: 1, justifyContent: 'flex-end' },
  nameCard: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, gap: 16,
  },
  nameCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nameCardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  nameInput: {
    height: 44, backgroundColor: '#F8F8FA', borderRadius: 10,
    paddingHorizontal: 14, fontSize: 15, color: '#1A1A2E',
    borderWidth: 1, borderColor: '#E0D9F5',
  },
  nameCardActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#E0D9F5', alignItems: 'center',
  },
  cancelText: { fontSize: 15, color: '#7A7A9A', fontWeight: '500' },
  confirmBtn: { flex: 2, paddingVertical: 12, borderRadius: 10, backgroundColor: '#6454ab', alignItems: 'center' },
  confirmText: { fontSize: 15, color: '#FFFFFF', fontWeight: '600' },
  importRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  importInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1A1A2E',
    borderWidth: 1,
    borderColor: '#E0D9F5',
  },
  importBtn: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#6454ab',
    justifyContent: 'center',
    alignItems: 'center',
  },
  importBtnDisabled: {
    backgroundColor: '#E0E0E0',
  },
  importBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  importBtnTextDisabled: {
    color: '#A5A5A5',
  },
  shareCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    minWidth: 260,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  shareCardTitle: {
    fontSize: 14,
    color: '#A5A5A5',
    fontWeight: '500',
  },
  shareCodeText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1A1A2E',
    letterSpacing: 6,
    marginVertical: 8,
  },
  shareCardHint: {
    fontSize: 12,
    color: '#C5C5C5',
    marginBottom: 8,
  },
  shareCardActions: {
    flexDirection: 'row',
    marginTop: 8,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: '#6454ab',
  },
  copyBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
