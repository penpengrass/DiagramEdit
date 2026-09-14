import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useOudData } from '@/context/oud-data-context';
import type { TimeEntry, TrainData } from '@shared/types/timetable';
import { formatTime } from '@shared/utils/Time';

const STATION_COLUMN_WIDTH = 120;
const TRAIN_COLUMN_WIDTH = 92;

function getTimeText(entry: TimeEntry | undefined): { arrival: string; departure: string } {
  if (!entry) {
    return { arrival: '', departure: '' };
  }

  if (entry.stop === '2') {
    return { arrival: 'レ', departure: 'レ' };
  }

  if (entry.stop === '0') {
    return { arrival: '・・・', departure: '・・・' };
  }

  return {
    arrival: entry.arrive ? formatTime(entry.arrive) : '',
    departure: entry.departure ? formatTime(entry.departure) : '',
  };
}

function getTerminalStationName(
  train: TrainData,
  stations: { name: string }[],
  fromStart: boolean,
): string {
  const indices = fromStart
    ? train.time.map((_, index) => index)
    : train.time.map((_, index) => train.time.length - index - 1);

  const stationIndex = indices.find((index) => {
    const entry = train.time[index];
    return entry && entry.stop !== '0' && entry.stop !== '2' && (entry.arrive || entry.departure);
  });

  return stationIndex == null ? '' : stations[stationIndex]?.name ?? '';
}

export default function TrainPreviewScreen() {
  const { parsedData } = useOudData();
  const trains: TrainData[] = [
    ...(parsedData?.KudariData ?? []),
    ...(parsedData?.NoboriData ?? []),
  ].slice(5, 18);
  const stations = parsedData?.stations ?? [];
  const tableWidth = STATION_COLUMN_WIDTH + trains.length * TRAIN_COLUMN_WIDTH;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title">列車プレビュー</ThemedText>
          {trains.length > 0 && stations.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View style={[styles.table, { width: tableWidth }]}>
                <View style={styles.row}>
                  <View style={[styles.stationHeader, styles.headerCell]}>
                    <ThemedText type="smallBold">列車番号</ThemedText>
                  </View>
                  {trains.map((train, index) => (
                    <View key={`${train.DiaLine}-${train.id}-${index}`} style={[styles.trainHeader, styles.headerCell]}>
                      <ThemedText type="smallBold" numberOfLines={1}>{train.number}</ThemedText>
                      <ThemedText type="small">{train.dir === 0 ? '下り' : '上り'}</ThemedText>
                    </View>
                  ))}
                </View>
                <View style={styles.row}>
                  <View style={[styles.stationHeader, styles.headerCell]}>
                    <ThemedText type="smallBold">種別</ThemedText>
                  </View>
                  {trains.map((train, index) => (
                    <View key={`${train.DiaLine}-${train.id}-type-${index}`} style={[styles.trainHeader, styles.headerCell]}>
                      <ThemedText type="small" numberOfLines={1}>
                        {parsedData?.TrainType[train.type]?.ryakushou ?? '種別未定'}
                      </ThemedText>
                    </View>
                  ))}
                </View>
                {(['始発駅', '終着駅'] as const).map((label, terminalIndex) => (
                  <View key={label} style={styles.row}>
                    <View style={[styles.stationHeader, styles.headerCell]}>
                      <ThemedText type="smallBold">{label}</ThemedText>
                    </View>
                    {trains.map((train, index) => (
                      <View key={`${train.DiaLine}-${train.id}-${label}-${index}`} style={[styles.trainCell, styles.headerCell]}>
                        <ThemedText type="small" numberOfLines={1}>
                          {getTerminalStationName(train, stations, terminalIndex === 0)}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                ))}
                {stations.map((station, stationIndex) => (
                  <View key={station.id} style={styles.row}>
                    <View style={[styles.stationHeader, styles.bodyCell]}>
                      <ThemedText type="small" numberOfLines={1}>{station.name}</ThemedText>
                    </View>
                    {trains.map((train, trainIndex) => {
                      const time = getTimeText(train.time[stationIndex]);
                      return (
                        <View key={`${train.DiaLine}-${train.id}-${station.id}-${trainIndex}`} style={[styles.trainCell, styles.bodyCell]}>
                          <ThemedText type="small">{time.arrival || ' '}</ThemedText>
                          <ThemedText type="smallBold">{time.departure || ' '}</ThemedText>
                        </View>
                      );
                    })}
                  </View>
                ))}
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