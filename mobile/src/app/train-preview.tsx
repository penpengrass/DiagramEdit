import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useOudData } from '@/context/oud-data-context';
import type { TrainData } from '@shared/types/timetable';
import {
  getOudTrainTableDisplayModel,
} from '@shared/utils/timetableDisplay';

const STATION_COLUMN_WIDTH = 120;
const TRAIN_COLUMN_WIDTH = 92;

export default function TrainPreviewScreen() {
  const { parsedData } = useOudData();
  const trains: TrainData[] = [
    ...(parsedData?.KudariData ?? []),
    ...(parsedData?.NoboriData ?? []),
  ].slice(5, 30);
  const stations = parsedData?.stations ?? [];
  const displayModel = getOudTrainTableDisplayModel(trains, parsedData?.TrainType ?? [], stations);
  const tableWidth = STATION_COLUMN_WIDTH + trains.length * TRAIN_COLUMN_WIDTH;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title">時刻表</ThemedText>
          {trains.length > 0 && stations.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View style={[styles.table, { width: tableWidth }]}>
                {displayModel.headerRows.slice(0, 5).map((row) => (
                  <View key={row.key} style={styles.row}>
                    <View style={[styles.stationHeader, styles.headerCell]}>
                      <ThemedText type="smallBold">{row.label}</ThemedText>
                    </View>
                    {row.values.map((cell) => (
                      <View key={`${row.key}-${cell.trainKey}`} style={[styles.trainCell, styles.headerCell]}>
                        <ThemedText type="small" numberOfLines={1}>{cell.value}</ThemedText>
                      </View>
                    ))}
                  </View>
                ))}
                {displayModel.stationRows.map((row) => (
                  <View key={row.key} style={styles.row}>
                    <View style={[styles.stationHeader, styles.bodyCell]}>
                      <ThemedText type="small" numberOfLines={1}>{row.mode === 'railNumber' ? '発着番線' : row.stationName}</ThemedText>
                    </View>
                    {row.cells.map((cell) => (
                      <View key={`${row.key}-${cell.trainKey}`} style={[styles.trainCell, styles.bodyCell]}>
                        <ThemedText type={row.mode === 'railNumber' ? 'small' : 'smallBold'}>{cell.value}</ThemedText>
                      </View>
                    ))}
                  </View>
                ))}
                <View style={styles.row}>
                  <View style={[styles.stationHeader, styles.headerCell]}>
                    <ThemedText type="smallBold">{displayModel.headerRows[5]?.label ?? '路線外終着'}</ThemedText>
                  </View>
                  {displayModel.headerRows[5]?.values.map((cell) => (
                    <View key={`${displayModel.headerRows[5].key}-${cell.trainKey}`} style={[styles.trainCell, styles.headerCell]}>
                      <ThemedText type="small" numberOfLines={1}>{cell.value}</ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>
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
  table: { borderWidth: 1, borderColor: '#d1d5db' },
  row: { flexDirection: 'row' },
  stationHeader: { width: STATION_COLUMN_WIDTH },
  trainHeader: { width: TRAIN_COLUMN_WIDTH },
  trainCell: { width: TRAIN_COLUMN_WIDTH },
  headerCell: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 6, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#d1d5db', backgroundColor: '#f3f4f6' },
  bodyCell: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 6, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#e5e7eb' },
});