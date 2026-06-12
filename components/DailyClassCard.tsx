import { Pressable, StyleSheet, Text, View } from "react-native";

// @ts-ignore
const States = ({ classInfo }) => {
  if (classInfo.status === "prepare") {
    return (
      <Text style={[styles.rightText, styles.prepareText]}>
        {classInfo.time}后
      </Text>
    );
  } else if (classInfo.status === "ongoing") {
    return (
      <Text style={[styles.rightText, styles.ongoingText]}>
        {classInfo.time}分
      </Text>
    );
  } else if (classInfo.status === "ended") {
    return <Text style={[styles.rightText, styles.endedText]}>已结束</Text>;
  }
};
// @ts-ignore
const DailyClassCard = ({ classInfo, onPress }: { classInfo: any; onPress?: (info: any) => void }) => {
  const content = (
    <>
      <View style={styles.leftTime}>
        <Text style={styles.timeTextFrom}>{classInfo.startTime}</Text>
        <Text style={styles.timeTextTo}>{classInfo.endTime}</Text>
      </View>
      <View
        style={[
          styles.bar,
          { backgroundColor: classInfo.colorSheet.highlight },
        ]}
      ></View>
      <View style={styles.rightClassInfo}>
        <Text style={styles.className}>{classInfo.className}</Text>
        <Text style={styles.detail}>
          {classInfo.location} | {classInfo.teacher}
        </Text>
      </View>
      <View style={styles.rightState}>
        <States classInfo={classInfo} />
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={() => onPress(classInfo)}
        style={({ pressed }) => [styles.container, pressed && { opacity: 0.85 }]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={styles.container}>{content}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // width: '100%',
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "flex-start",
    flexDirection: "row",
    marginBottom: 20,
    marginTop: 15,
  },
  leftTime: {
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "column",
    width: "15%",
    // backgroundColor: '#e5e5e5',
    paddingVertical: 5,
  },
  timeTextTo: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#999999",
  },
  timeTextFrom: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#808080",
  },
  bar: {
    width: "1.5%",
    height: "90%",
    borderRadius: 5,
  },
  rightClassInfo: {
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexDirection: "column",
    paddingLeft: 8,
    width: "60%",
    // backgroundColor: '#e5e5e5',
  },
  className: {
    fontSize: 14,
    fontWeight: "600",
    color: "#545454",
    paddingBottom: 4,
  },
  detail: {
    fontSize: 12,
    fontWeight: "500",
    color: "#818181",
  },
  rightState: {
    flex: 1,
    alignItems: "flex-end",
    justifyContent: "center",
    flexDirection: "column",
    // backgroundColor: '#e5e5e5',
  },
  rightText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  prepareText: {
    color: "#F26D56",
  },
  ongoingText: {
    color: "#4B9AFF",
  },
  endedText: {
    color: "#8C8C8C",
  },
});

export default DailyClassCard;
