import { Platform, StyleSheet, ScrollView, Text, View, Button, TextInput } from 'react-native';
import React, { useState, useEffect } from 'react';

import { useGlobalState } from '@/state/GlobalState.js';

export default function jsonImport() {

    const { state, dispatch } = useGlobalState();
    const activeSchedule = (state as any).schedules.find((s: any) => s.id === (state as any).activeScheduleId) ?? (state as any).schedules[0];
    const [text, setText] = useState('');
    function importJSON() {

        const json = JSON.parse(text);
        dispatch({ type: 'SET_SCHEDULE_PERIOD', payload: json.AllWeek});
        dispatch({ type: 'SET_MY_CLASS_LIST', payload: json.classList});
    }
    return (
        <ScrollView style={[styles.container]}>
            <TextInput
                placeholder="请输入JSON数据"
                value={text}
                onChangeText={setText}
                multiline // 👈 关键：启用多行输入
                numberOfLines={4} // 👈 设置显示多少行
                textAlignVertical="top" // 👍 可选：文本垂直顶部对齐，体验更好
            />
            <Button title={'导入JSON数据'} onPress={() => importJSON()} />
            <Text>timeLabelList: {JSON.stringify((activeSchedule as any).timeLabelList)}</Text>
            <Text>myClassList: {JSON.stringify((activeSchedule as any).myClassList)}</Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        // flex: 1,
        backgroundColor: '#fff',
    },



});
