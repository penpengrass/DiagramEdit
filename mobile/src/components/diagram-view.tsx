import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Station, TrainData, TrainType } from '@shared/types/timetable';
import {
  getDiagramMinutes,
  getDiagramStartHour,
  getDiagramStationIndex,
  getDiagramTrainGroups,
  type DiagramDisplayMode,
} from '@shared/utils/diagram';
import { Time } from '@shared/utils/Time';
import { toOudDisplayColor } from '@shared/utils/timetableDisplay';

const LEFT_MARGIN = 96;
const MINUTES_PER_DAY = 24 * 60;
const MINUTE_WIDTH = 1;
const ROW_HEIGHT = 44;
const DIAGRAM_WIDTH = LEFT_MARGIN + MINUTES_PER_DAY * MINUTE_WIDTH;

type DiagramPoint = { x: number; y: number };
type DiagramSegment = { start: DiagramPoint; end: DiagramPoint; color: string; key: string };

type Props = {
  kudariTrains: TrainData[];
  noboriTrains: TrainData[];
  stations: Station[];
  trainTypes: TrainType[];
  kitenJikoku?: number;
};

function getTrainSegments(
  trains: TrainData[],
  isNobori: boolean,
  stations: Station[],
  trainTypes: TrainType[],
  kitenJikoku: number,
): DiagramSegment[] {
  return trains.flatMap((train, trainIndex) => {
    const points: DiagramPoint[] = [];
    const color = toOudDisplayColor(trainTypes[train.type]?.color || '#64748b') || '#64748b';

    train.time.forEach((entry, timeIndex) => {
      const stationIndex = getDiagramStationIndex(timeIndex, stations.length, isNobori);
      if (stationIndex < 0 || stationIndex >= stations.length) return;
      const y = stationIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

      [entry.arrive, entry.departure].forEach((time) => {
        if (!(time instanceof Time)) return;
        points.push({
          x: LEFT_MARGIN + getDiagramMinutes(time, kitenJikoku),
          y,
        });
      });
    });

    return points.slice(1).flatMap((end, pointIndex) => {
      const start = points[pointIndex];
      if (!start || end.x < start.x - 60) return [];
      return [{ start, end, color, key: `${isNobori ? 'n' : 'k'}-${trainIndex}-${pointIndex}` }];
    });
  });
}

function DiagramLine({ segment }: { segment: DiagramSegment }) {
  const dx = segment.end.x - segment.start.x;
  const dy = segment.end.y - segment.start.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  return (
    <View
      style={[
        styles.trainLine,
        {
          backgroundColor: segment.color,
          left: segment.start.x,
          top: segment.start.y,
          width: length,
          transform: [{ rotate: `${angle}rad` }],
        },
      ]}
    />
  );
}

export function DiagramView({ kudariTrains, noboriTrains, stations, trainTypes, kitenJikoku = 0 }: Props) {
  const [displayMode, setDisplayMode] = useState<DiagramDisplayMode>('both');
  const startHour = getDiagramStartHour(kitenJikoku);
  const trainGroups = getDiagramTrainGroups(kudariTrains, noboriTrains, displayMode);
  const segments = useMemo(
    () => trainGroups.flatMap(({ trains, isNobori }) => getTrainSegments(trains, isNobori, stations, trainTypes, kitenJikoku)),
    [kitenJikoku, stations, trainGroups, trainTypes],
  );

  if (!stations.length) {
    return <Text style={styles.emptyText}>先にOUD2ファイルを読み込んでください。</Text>;
  }

  return (
    <View>
      <View style={styles.modeContainer}>
        <Text style={styles.modeLabel}>表示する列車</Text>
        {([
          ['kudari', '下りのみ'],
          ['nobori', '上りのみ'],
          ['both', '両方'],
        ] as const).map(([value, label]) => (
          <Pressable key={value} style={styles.modeButton} onPress={() => setDisplayMode(value)}>
            <View style={[styles.radio, displayMode === value && styles.radioSelected]} />
            <Text>{label}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View style={[styles.diagram, { width: DIAGRAM_WIDTH, height: stations.length * ROW_HEIGHT }]}>
          {Array.from({ length: 25 }, (_, hour) => (
            <View key={`grid-${hour}`} style={[styles.hourLine, { left: LEFT_MARGIN + hour * 60 }]}>
              <Text style={styles.hourLabel}>{String((startHour + hour) % 24).padStart(2, '0')}</Text>
            </View>
          ))}
          {stations.map((station, index) => (
            <View key={station.id} style={[styles.stationRow, { top: index * ROW_HEIGHT }]}>
              <Text style={styles.stationName} numberOfLines={1}>{station.name}</Text>
            </View>
          ))}
          {segments.map((segment) => <DiagramLine key={segment.key} segment={segment} />)}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  modeContainer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 12 },
  modeLabel: { width: '100%', fontWeight: '700' },
  modeButton: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: '#64748b' },
  radioSelected: { borderWidth: 5, borderColor: '#2563eb' },
  diagram: { position: 'relative', backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1' },
  hourLine: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: '#e2e8f0' },
  hourLabel: { position: 'absolute', top: 4, left: -10, width: 24, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  stationRow: { position: 'absolute', left: 0, width: DIAGRAM_WIDTH, height: ROW_HEIGHT, borderBottomWidth: 1, borderColor: '#e2e8f0' },
  stationName: { position: 'absolute', left: 4, top: 14, width: LEFT_MARGIN - 10, fontSize: 12, textAlign: 'right' },
  trainLine: { position: 'absolute', height: 2, transformOrigin: 'left center' },
  emptyText: { color: '#64748b' },
});
