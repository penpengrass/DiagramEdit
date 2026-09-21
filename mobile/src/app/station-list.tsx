import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useOudData } from '@/context/oud-data-context';

export default function StationListScreen() {
  const { parsedData } = useOudData();
  const stations = parsedData?.stations?.slice(0, 74) ?? [];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title">駅一覧</ThemedText>
          {stations.length > 0 ? stations.map((station: any) => (
            <ThemedView key={station.id} style={styles.station}>
              <ThemedText>{station.name}</ThemedText>
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
  content: { padding: 16, gap: 8 },
  station: { padding: 12, borderRadius: 8 },
});