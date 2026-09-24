import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useOudData } from '@/context/oud-data-context';
import type { TrainData } from '@shared/types/timetable';
import {
  getOudTrainTableDisplayModel,
  getOrderedStations,
  toOudDisplayColor,
} from '@shared/utils/timetableDisplay';

const STATION_COLUMN_WIDTH = 60;
const TRAIN_COLUMN_WIDTH = 50;
type TimetableDirection = 'down' | 'up';

export default function TrainPreviewScreen() {
  const { parsedData } = useOudData();
  const theme = useTheme();
  const [direction, setDirection] = useState<TimetableDirection>('down');
  const sourceTrains: TrainData[] = direction === 'down'
    ? (parsedData?.KudariData ?? [])
    : (parsedData?.NoboriData ?? []);
  const trains = sourceTrains.slice(0, 100);
  const stations = parsedData
    ? getOrderedStations(parsedData.stations, direction === 'down' ? 'Kudari' : 'Nobori')
    : [];
  const displayModel = getOudTrainTableDisplayModel(trains, parsedData?.TrainType ?? [], stations);
  const tableWidth = STATION_COLUMN_WIDTH + trains.length * TRAIN_COLUMN_WIDTH;
  const outerHeaderRows = [
    {
      key: 'outerDepartureStation',
      label: '始発',
      values: displayModel.columns.map((column) => ({ trainKey: column.key, value: column.outerDeparture.name })),
    },
    {
      key: 'outerDepartureTime',
      label: '時刻',
      values: displayModel.columns.map((column) => ({ trainKey: column.key, value: column.outerDeparture.time })),
    },
  ];
  const outerFooterRows = [
    {
      key: 'outerArrivalStation',
      label: '終着',
      values: displayModel.columns.map((column) => ({ trainKey: column.key, value: column.outerArrival.name })),
    },
    {
      key: 'outerArrivalTime',
      label: '時刻',
      values: displayModel.columns.map((column) => ({ trainKey: column.key, value: column.outerArrival.time })),
    },
  ];
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title">時刻表</ThemedText>
          <View style={styles.directionControl}>
            <Pressable
              style={[styles.directionButton, { backgroundColor: theme.backgroundSelected }, direction === 'down' && styles.activeDirectionButton]}
              onPress={() => setDirection('down')}
              disabled={!parsedData}
            >
              <ThemedText style={[styles.directionButtonText, direction === 'down' && styles.activeDirectionButtonText]}>
                下り
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.directionButton, { backgroundColor: theme.backgroundSelected }, direction === 'up' && styles.activeDirectionButton]}
              onPress={() => setDirection('up')}
              disabled={!parsedData}
            >
              <ThemedText style={[styles.directionButtonText, direction === 'up' && styles.activeDirectionButtonText]}>
                上り
              </ThemedText>
            </Pressable>
          </View>
          {trains.length > 0 && stations.length > 0 ? (
            <View style={styles.tableViewport}>
              <ScrollView horizontal showsHorizontalScrollIndicator>
                <View style={[styles.table, { width: tableWidth, borderColor: theme.textSecondary }]}>
                  {[...displayModel.headerRows.slice(0, 4), ...outerHeaderRows].map((row) => (
                    <View key={row.key} style={styles.row}>
                      <View style={[styles.stationHeader, styles.headerCell]}>
                      <ThemedText type="smallBold" style={{ color: '#000000' }}>{row.label}</ThemedText>
                      </View>
                      {row.values.map((cell) => (
                        <View key={`${row.key}-${cell.trainKey}`} style={[styles.trainCell, styles.headerCell]}>
                          <ThemedText
                            type="small"
                            style={[styles.trainText, { color: toOudDisplayColor(displayModel.columns.find((column) => column.key === cell.trainKey)?.typeColor ?? '') || undefined }]}
                            numberOfLines={1}
                          >
                            {cell.value}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                  ))}
                  {displayModel.stationRows.map((row) => (
                    <View key={row.key} style={styles.row}>
                      <View style={[styles.stationHeader, styles.bodyCell]}>
                        <ThemedText type="small" style={{ color: '#000000' }} numberOfLines={1}>{row.mode === 'railNumber' ? '発着番線' : row.stationName}</ThemedText>
                      </View>
                      {row.cells.map((cell) => (
                        <View key={`${row.key}-${cell.trainKey}`} style={[styles.trainCell, styles.bodyCell]}>
                          <ThemedText
                            type={row.mode === 'railNumber' ? 'small' : 'smallBold'}
                            style={[styles.trainText, { color: toOudDisplayColor(cell.typeColor) || undefined }]}
                          >
                            {cell.value}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                  ))}
                  {[...displayModel.headerRows.slice(2, 2), ...outerFooterRows].map((row) => (
                    <View key={row.key} style={styles.row}>
                      <View style={[styles.stationHeader, styles.headerCell]}>
                      <ThemedText type="smallBold" style={{ color: '#000000' }}>{row.label}</ThemedText>
                      </View>
                      {row.values.map((cell) => (
                        <View key={`${row.key}-${cell.trainKey}`} style={[styles.trainCell, styles.headerCell]}>
                          <ThemedText
                            type="small"
                            style={[styles.trainText, { color: toOudDisplayColor(displayModel.columns.find((column) => column.key === cell.trainKey)?.typeColor ?? '') || undefined }]}
                            numberOfLines={1}
                          >
                            {cell.value}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>
              <ThemedView style={[styles.fixedColumn, { backgroundColor: '#ffffff' }]} pointerEvents="none">
                {[...displayModel.headerRows.slice(0, 4), ...outerHeaderRows].map((row) => (
                  <View key={`fixed-${row.key}`} style={[styles.stationHeader, styles.headerCell]}>
                    <ThemedText type="smallBold" style={{ color: '#000000' }}>{row.label}</ThemedText>
                  </View>
                ))}
                {displayModel.stationRows.map((row) => (
                  <View key={`fixed-${row.key}`} style={[styles.stationHeader, styles.bodyCell]}>
                    <ThemedText type="small" style={{ color: '#000000' }} numberOfLines={1}>
                      {row.mode === 'railNumber' ? '発着番線' : row.stationName}
                    </ThemedText>
                  </View>
                ))}
                {[...displayModel.headerRows.slice(2, 2), ...outerFooterRows].map((row) => (
                  <View key={`fixed-${row.key}`} style={[styles.stationHeader, styles.headerCell]}>
                    <ThemedText type="smallBold" style={{ color: '#000000' }}>{row.label}</ThemedText>
                  </View>
                ))}
              </ThemedView>
            </View>
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
  directionControl: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  directionButton: { minWidth: 80, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center', borderRadius: 8, backgroundColor: '#e5e7eb' },
  activeDirectionButton: { backgroundColor: '#2563eb' },
  directionButtonText: { fontWeight: '700' },
  activeDirectionButtonText: { color: '#ffffff' },
  table: { borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#ffffff' },
  tableViewport: { width: '100%', position: 'relative' },
  fixedColumn: { position: 'absolute', left: 0, top: 0, zIndex: 2, elevation: 2 },
  row: { flexDirection: 'row' },
  stationHeader: {color: '#000000', width: STATION_COLUMN_WIDTH },
  trainHeader: { width: TRAIN_COLUMN_WIDTH },
  trainCell: { height: 20, width: TRAIN_COLUMN_WIDTH, alignItems: 'center' },
  trainText: { fontSize: 12, textAlign: 'center' },
  headerCell: { minHeight: 14, justifyContent: 'center', paddingHorizontal: 0, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#d1d5db', backgroundColor: '#ffffff' },
  bodyCell: { minHeight: 10, justifyContent: 'center', paddingHorizontal: 0, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#e5e7eb' },
});
