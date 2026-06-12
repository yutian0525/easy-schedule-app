import { StyleSheet, Text, View } from 'react-native';

// @ts-ignore
const SettingCard = ({ title, children }) => {
    return (
        <View style={[styles.container]}>
            <Text style={[styles.title]}>{title}</Text>
            <View style={styles.itemArea}>
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        // backgroundColor: '#8f2020ff',
        flex: 1,
        padding: 18,
        paddingTop: 3,
        paddingBottom: 3,
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        flexDirection: 'column',

    },
    title: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 6,
        marginLeft: 10,
        color: '#5f5f5fff',
    },
    itemArea: {
        width: '100%',
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        flexDirection: 'column',
        backgroundColor: '#FBFBFB',
        borderRadius: 15,
        // padding: 20,
        shadowColor: '#cdcdcdff',              // 阴影颜色
        shadowOffset: {                   // 阴影偏移量
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.1,              // 阴影透明度
        shadowRadius: 10.84,               // 阴影扩散半径
        elevation: 5,
    },
});

export default SettingCard;
