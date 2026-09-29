import { StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatTime } from '@shared/utils/Time';

export type StationTimetableTrain = {
  id: string;
  trainNumber: string;
  trainType: string;
  direction: '上り' | '下り' | 0 | 1;
  arrival?: string;
  departure?: string;
  terminal: string;
  track?: string;
  note?: string;
};

type StationTimetableProps = {
  stationName?: string;
  trains?: StationTimetableTrain[];
};

export function StationTimetable({
  stationName = '新大阪',
  trains = [],
}: StationTimetableProps) {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle" style={styles.headerTitle}>
        {stationName}駅
      </ThemedText>
      <ThemedText type="small" style={styles.headerSubtitle}>
        発車時刻表
      </ThemedText>

      <ThemedView style={styles.tableHeader}>
        <ThemedText type="smallBold" style={styles.columnTrain}>
          列車
        </ThemedText>
        <ThemedText type="smallBold" style={styles.columnType}>
          種別
        </ThemedText>
        <ThemedText type="smallBold" style={styles.columnTime}>
          時刻
        </ThemedText>
        <ThemedText type="smallBold" style={styles.columnDestination}>
          行先
        </ThemedText>
      </ThemedView>

      {trains && trains.length > 0 ? trains.map((train) => {
        const direction = train.direction === 0 ? '下り' : train.direction === 1 ? '上り' : train.direction;
        const displayTime = train.departure || train.arrival;

        return (
          <ThemedView key={train.id} style={styles.row}>
            <ThemedView style={styles.trainSummary}>
              <ThemedText type="smallBold" style={styles.trainNumber}>
                {train.trainNumber}
              </ThemedText>
            </ThemedView>
            <ThemedView style={styles.trainSummary}>
              <ThemedText type="small" style={styles.trainType}>
                {train.trainType}
              </ThemedText>
            </ThemedView>
            <ThemedView style={styles.timeSummary}>
              <ThemedText type="small" style={styles.directionText}>
                {direction}
              </ThemedText>
              <ThemedText type="smallBold" style={styles.timeValue}>
                {displayTime ? formatTime(displayTime) : '---'}
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.detailSummary}>
              <ThemedText type="small" style={styles.terminalText}>
                {train.terminal}
              </ThemedText>
              {train.track ? <ThemedText type="small" style={styles.trackText}>{train.track}番線</ThemedText> : null}
              {train.note ? <ThemedText type="small" style={styles.noteText}>{train.note}</ThemedText> : null}
            </ThemedView>
          </ThemedView>
        );
      }) : (
        <ThemedText type="small" style={styles.emptyText}>
          表示できる列車がありません。
        </ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 20,
    padding: Spacing.three,
    gap: Spacing.two,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  headerTitle: {
    marginTop: Spacing.one,
  },
  headerSubtitle: {
    opacity: 0.7,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.one,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
  },
  columnTrain: {
    flex: 1.2,
  },
  columnType: {
    flex: 1.2,
  },
  columnTime: {
    flex: 1.2,
    fontSize: 15,
  },
  columnDestination: {
    flex: 1.4,
    fontSize: 15,
    textAlign: 'right',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.one,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: Spacing.one,
  },
  trainSummary: {
    flex: 1.2,
    gap: Spacing.half,
  },
  trainBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.half,
    borderRadius: 999,
    overflow: 'hidden',
  },
  trainNumber: {
    fontWeight: '700',
  },
  trainType: {
    opacity: 1,
    fontSize: 20,
  },
  timeSummary: {
    flex: 1.4,
    flexDirection: 'row',
    gap: Spacing.one,
  },
  timeBox: {
    minWidth: 48,
  },
  timeLabel: {
    opacity: 0.6,
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 20,
  },
  detailSummary: {
    flex: 1.4,
    alignItems: 'flex-end',
    gap: 2,
  },
  directionText: {
    fontSize: 12,
  },
  terminalText: {
    fontSize: 20,
    textAlign: 'right',
  },
  trackText: {
    fontSize: 12,
    opacity: 0.7,
  },
  noteText: {
    fontSize: 11,
    opacity: 0.8,
  },
  emptyText: {
    paddingVertical: Spacing.two,
    opacity: 0.7,
  },
});
