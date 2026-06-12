/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#9FB898';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#8DA895',
    tabIconDefault: '#8DA895',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const TimeLabelColors = {
  chipBg:        '#c9ebca',
  chipText:      '#2d6a4f',
  dotMorning:    '#FF9800',
  dotAfternoon:  '#6454ab',
  dotNight:      '#5856D6',
};

export const SwitchColors = {
  trackActive:    '#b5a9d9',   // Switch track when ON
  trackInactive:  '#E0E0E0',   // Switch track when OFF
  thumbActive:    '#6454ab',   // Switch thumb when ON
  thumbInactive:  '#f4f3f4',   // Switch thumb when OFF
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const BottomPickerColors = {
  // 遮罩
  backdrop:       'rgba(0,0,0,0.45)',
  // 卡片
  cardBg:         '#FFFFFF',
  // 拖拽把手
  handle:         '#E0E0E0',
  // Header 分割线
  headerDivider:  '#F0F0F0',
  // 选中项高亮背景
  highlight:      '#EDE9F7',
  // 文字 - 标题 / 选中项
  textPrimary:    '#1A1A2E',
  // 文字 - 取消按钮 / 非选中项 / 标签 / 提示
  textSecondary:  '#A5A5A5',
  // 文字 - 确认按钮
  textConfirm:    '#6454ab',
};
