import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useOudData } from '@/context/oud-data-context';
import { formatTime } from '@shared/utils/Time';

export default function TrainPreviewScreen() {
  const { parsedData } = useOudData();
  const trains = [ ...(parsedData?.KudariData ?? []), ...(parsedData?.NoboriData ?? []) ].slice(5, 18);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title">列車プレビュー</ThemedText>
          {trains.length > 0 ? trains.map((train: any, index) => (
            <ThemedView key={`${train.number}-${index}`} style={styles.trainCard}>
              <ThemedText type="smallBold">
                {train.dir === 0 ? '下り' : '上り'} {train.number} / {parsedData?.TrainType[train.type]?.ryakushou ?? '種別未定'}
              </ThemedText>
              <View style={styles.timeRow}>
                {train.time.slice(0, 30).map((entry: any, timeIndex: number) => (
                  <View key={`${train.number}-${timeIndex}`} style={styles.timeCell}>
                    <ThemedText type="small">{entry.stop}</ThemedText>
                    <ThemedText type="smallBold">
                      {entry.arrive ? formatTime(entry.arrive) : entry.departure ? formatTime(entry.departure) : '---'}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </ThemedView>
          )) : (
            <ThemedText type="small">先にOUD2ファイルを読み込んでください。</ThemedText>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { padding: 16, gap: 12 },
  trainCard: { padding: 12, borderRadius: 12, gap: 8, borderWidth: 1, borderColor: '#d1d5db' },
  timeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeCell: { minWidth: 54, padding: 6, borderRadius: 8, backgroundColor: '#f3f4f6' },
});