import React, { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BottomPickerColors } from '@/constants/theme';

const ITEM_HEIGHT = 44;
const VISIBLE_COUNT = 5;
const PADDING = ((VISIBLE_COUNT - 1) / 2) * ITEM_HEIGHT; // 88

interface PickerColumnProps {
  items: string[];
  selectedIndex: number;
  onIndexChange: (index: number) => void;
}

export default function PickerColumn({
  items,
  selectedIndex,
  onIndexChange,
}: PickerColumnProps) {
  const scrollRef = useRef<ScrollView>(null);
  const isInitialized = useRef(false);

  // 初始定位，无动画
  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: selectedIndex * ITEM_HEIGHT,
        animated: false,
      });
      isInitialized.current = true;
    });
  }, []);

  // 外部 selectedIndex 变化时同步（仅初始化后生效）
  useEffect(() => {
    if (!isInitialized.current) return;
    scrollRef.current?.scrollTo({
      y: selectedIndex * ITEM_HEIGHT,
      animated: true,
    });
  }, [selectedIndex]);

  function handleMomentumScrollEnd(e: any) {
    const offsetY = e.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    onIndexChange(clamped);
  }

  return (
    <View style={styles.container}>
      {/* 高亮背景条 */}
      <View
        style={[styles.highlight, { top: PADDING }]}
        pointerEvents="none"
      />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: PADDING }}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
      >
        {items.map((item, index) => {
          const isSelected = index === selectedIndex;
          return (
            <View key={index} style={styles.item}>
              <Text
                style={[
                  styles.itemText,
                  isSelected ? styles.selectedText : styles.unselectedText,
                ]}
              >
                {item}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: VISIBLE_COUNT * ITEM_HEIGHT,
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: ITEM_HEIGHT,
    backgroundColor: BottomPickerColors.highlight,
    borderRadius: 8,
    zIndex: 0,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    textAlign: 'center',
  },
  selectedText: {
    fontSize: 17,
    fontWeight: '700',
    color: BottomPickerColors.textPrimary,
  },
  unselectedText: {
    fontSize: 15,
    fontWeight: 'normal',
    color: BottomPickerColors.textSecondary,
  },
});
