import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RunningPositionView } from '@/components/running-position-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useOudData } from '@/context/oud-data-context';

export default function RunningPositionScreen() {
  const { parsedData } = useOudData();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {parsedData ? (
            <RunningPositionView
              kudariTrains={parsedData.KudariData}
              noboriTrains={parsedData.NoboriData}
              stations={parsedData.stations}
              trainTypes={parsedData.TrainType}
              diagrams={parsedData.Diagrams}
            />
          ) : (
            <ThemedText type="small">先にOUD2ファイルを読み込んでください。</ThemedText>
          )}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { flex: 1, padding: 16, gap: 12 },
});
