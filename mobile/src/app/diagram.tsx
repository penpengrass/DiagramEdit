import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DiagramView } from '@/components/diagram-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useOudData } from '@/context/oud-data-context';

export default function DiagramScreen() {
  const { parsedData } = useOudData();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title">ダイヤグラム</ThemedText>
          {parsedData ? (
            <DiagramView
              kudariTrains={parsedData.KudariData}
              noboriTrains={parsedData.NoboriData}
              stations={parsedData.stations}
              trainTypes={parsedData.TrainType}
              diagrams={parsedData.Diagrams}
              kitenJikoku={parsedData.KitenJikoku}
            />
          ) : (
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
});
