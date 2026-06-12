import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AboutScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={{ paddingBottom: insets.bottom + 20 }} contentContainerStyle={styles.content}>
      <View style={styles.logoArea}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>课</Text>
        </View>
        <Text style={styles.appName}>简白课表</Text>
        <Text style={styles.appVersion}>版本 1.0.0</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>关于应用</Text>
        <View style={styles.card}>
          <Text style={styles.desc}>
            简白课表是一款专为学生设计的轻量课程表应用，帮助你轻松管理课程安排。
          </Text>
          <Text style={styles.desc}>
            支持多课表切换、课程提醒、周课表视图等功能，让你的校园生活更有条理。
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>功能特色</Text>
        <View style={styles.card}>
          {[
            '今日课程一览，实时掌握课程状态',
            '周课表网格视图，支持左右滑动切换周次',
            '多课表管理，支持课表分享与导入',
            '自定义节次时间配置',
            '课程前提醒通知',
          ].map((item, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.dot} />
              <Text style={styles.featureText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>技术信息</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>构建技术</Text>
            <Text style={styles.infoValue}>React Native + Expo</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>当前版本</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
        </View>
      </View>

      <Text style={styles.copyright}>© 2025 简白课表</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 18,
    paddingTop: 12,
  },
  logoArea: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#6454ab',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    shadowColor: '#6454ab',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  appName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  appVersion: {
    fontSize: 13,
    color: '#A5A5A5',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#A5A5A5',
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FBFBFB',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#cdcdcd',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  desc: {
    fontSize: 14,
    color: '#575757',
    lineHeight: 22,
    marginBottom: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6454ab',
    marginTop: 7,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: '#353535',
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F1F1',
  },
  infoLabel: {
    fontSize: 14,
    color: '#575757',
  },
  infoValue: {
    fontSize: 14,
    color: '#A5A5A5',
  },
  copyright: {
    textAlign: 'center',
    fontSize: 12,
    color: '#C5C5C5',
    marginTop: 8,
    marginBottom: 20,
  },
});
