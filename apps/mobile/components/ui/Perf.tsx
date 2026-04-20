import { View, StyleSheet } from 'react-native';
import { colors } from '../../lib/theme';

export function Perf({ color = colors.hairline }: { color?: string }) {
  return (
    <View style={styles.row}>
      {Array.from({ length: 40 }).map((_, i) => (
        <View key={i} style={[styles.dot, { backgroundColor: color }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', height: 1, marginVertical: 0 },
  dot: { width: 4, height: 1 },
});
