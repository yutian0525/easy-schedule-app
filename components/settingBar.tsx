import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import React from 'react';

interface SettingBarProps {
    title: string;
    detail?: string;
    value?: string;
    borderon?: boolean;
    onPress?: () => void;
    rightElement?: React.ReactNode;
}

const SettingBar: React.FC<SettingBarProps> = ({ title, detail, value = '', borderon = true, onPress, rightElement }) => {
    const content = (
        <View style={[styles.container, borderon ? { borderBottomWidth: 1, borderColor: '#f1f1f1ff' } : {}]}>
            <View style={styles.leftArea}>
                <Text style={[styles.title]}>{title}</Text>
                <Text style={[styles.detail]}>{detail}</Text>
            </View>
            <View style={styles.rightArea}>
                {rightElement
                    ? rightElement
                    : (
                        <>
                            <Text style={[styles.right]}>{value}</Text>
                            <AntDesign name="right" size={15} color="#464646ff" />
                        </>
                    )
                }
            </View>
        </View>
    );

    return onPress ? (
        <TouchableOpacity style={styles.touchableStyle} onPress={onPress}>
            {content}
        </TouchableOpacity>
    ) : (
        content
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-between',
        flexDirection: 'row',
    },
    touchableStyle: {
        width: '100%'
    },
    leftArea: {
        width: '65%',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        flexDirection: 'column',
        padding: 18,
        paddingRight: 5,
    },
    rightArea: {
        width: '35%',
        alignItems: 'center',
        justifyContent: 'flex-end',
        flexDirection: 'row',
        padding: 16,
        paddingLeft: 5,
        height: 50,
    },
    title: {
        width: '100%',
        textAlign: 'left',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 3,
        color: '#353535ff',
    },
    detail: {
        fontSize: 14,
        color: '#818181',
    },
    right: {
        fontSize: 14,
        color: '#818181',
        marginRight: 5,
    },
});

export default SettingBar;
