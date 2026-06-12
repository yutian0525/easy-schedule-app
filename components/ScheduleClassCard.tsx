import { Pressable, StyleSheet, Text, View } from 'react-native';

// @ts-ignore
const ScheduleClassCard = ({ classInfo, onPress }: { classInfo: any; onPress?: (info: any) => void }) => {
  const content = (
    <>
      <Text style={[styles.className, { color: classInfo.colorSheet.highlight }]}>{classInfo.className}</Text>
      <Text style={[styles.location, { color: classInfo.colorSheet.highlight }]}>@{classInfo.location}</Text>
      <Text style={[styles.teacher, { color: classInfo.colorSheet.highlight }]}>{classInfo.teacher}</Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={() => onPress(classInfo)}
        style={({ pressed }) => [
          styles.container,
          { backgroundColor: classInfo.colorSheet.background },
          pressed && { opacity: 0.85 },
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: classInfo.colorSheet.background }]}>
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 5,
    padding: 8,
    paddingTop: 12,
    paddingBottom: 12,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    flexDirection: 'column',

  },
  className: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  location: {
    fontSize: 10.5,
    fontWeight: 400,
    marginBottom: 2,
  },
  teacher: {
    fontSize: 10.5,
    fontWeight: 400,
  },


});

export default ScheduleClassCard;
