import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import type { Station, TrainData, TrainType } from '@shared/types/timetable';
import {
  adjustDiagramZoom,
  DIAGRAM_MAX_ZOOM,
  DIAGRAM_MIN_ZOOM,
  findNearestDiagramTrainKey,
  getDiagramHitDistance,
  getDiagramLineSegments,
  getDiagramLineWidth,
  getDiagramStartHour,
  getDiagramTrainGroups,
  type DiagramLineSegment,
  type DiagramDisplayMode,
} from '@shared/utils/diagram';
import { toOudDisplayColor } from '@shared/utils/timetableDisplay';

const LEFT_MARGIN = 96;
const ROW_HEIGHT = 44;
const DIAGRAM_WIDTH = LEFT_MARGIN + 24 * 60;

type Props = {
  kudariTrains: TrainData[];
  noboriTrains: TrainData[];
  stations: Station[];
  trainTypes: TrainType[];
  kitenJikoku?: number;
};

function DiagramLine({ segment, color, zoom, selected }: { segment: DiagramLineSegment; color: string; zoom: number; selected: boolean }) {
  const dx = segment.end.x - segment.start.x;
  const dy = segment.end.y - segment.start.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  const lineThickness = getDiagramLineWidth(selected) * zoom;

  return (
    <View
      style={[
        styles.trainLine,
        {
          backgroundColor: color,
          left: (segment.start.x - LEFT_MARGIN) * zoom,
          top: segment.start.y * zoom - lineThickness / 2,
          width: length * zoom,
          height: lineThickness,
          transform: [{ rotate: `${angle}rad` }],
        },
      ]}
    />
  );
}

export function DiagramView({ kudariTrains, noboriTrains, stations, trainTypes, kitenJikoku = 0 }: Props) {
  const { height: windowHeight } = useWindowDimensions();
  const headerScrollRef = useRef<ScrollView>(null);
  const plotHorizontalScrollRef = useRef<ScrollView>(null);
  const stationVerticalScrollRef = useRef<ScrollView>(null);
  const plotVerticalScrollRef = useRef<ScrollView>(null);
  const horizontalOffsetRef = useRef(0);
  const verticalOffsetRef = useRef(0);
  const [displayMode, setDisplayMode] = useState<DiagramDisplayMode>('both');
  const [zoom, setZoom] = useState(1);
  const [selectedTrainKey, setSelectedTrainKey] = useState<string | null>(null);
  const startHour = getDiagramStartHour(kitenJikoku);
  const trainGroups = useMemo(
    () => getDiagramTrainGroups(kudariTrains, noboriTrains, displayMode),
    [displayMode, kudariTrains, noboriTrains],
  );
  const segments = useMemo(
    () => getDiagramLineSegments(trainGroups, stations.length, ROW_HEIGHT, kitenJikoku, LEFT_MARGIN),
    [kitenJikoku, stations.length, trainGroups],
  );
  const plotWidth = (DIAGRAM_WIDTH - LEFT_MARGIN) * zoom;
  const plotHeight = stations.length * ROW_HEIGHT * zoom;
  const diagramViewportHeight = Math.max(220, Math.min(560, windowHeight * 0.5));
  const syncHorizontalScroll = (x: number, source: 'header' | 'plot') => {
    if (Math.abs(x - horizontalOffsetRef.current) < 1) return;
    horizontalOffsetRef.current = x;
    (source === 'header' ? plotHorizontalScrollRef : headerScrollRef).current?.scrollTo({ x, animated: false });
  };
  const syncVerticalScroll = (y: number, source: 'stations' | 'plot') => {
    if (Math.abs(y - verticalOffsetRef.current) < 1) return;
    verticalOffsetRef.current = y;
    (source === 'stations' ? plotVerticalScrollRef : stationVerticalScrollRef).current?.scrollTo({ y, animated: false });
  };

  if (!stations.length) {
    return <Text style={styles.emptyText}>先にOUD2ファイルを読み込んでください。</Text>;
  }

  const findNearestTrain = (x: number, y: number) =>
    findNearestDiagramTrainKey(segments, { x, y }, getDiagramHitDistance(zoom));

  return (
    <View>
      <View style={styles.zoomContainer}>
        <Pressable style={styles.zoomButton} onPress={() => setZoom((current) => adjustDiagramZoom(current, -1))} disabled={zoom <= DIAGRAM_MIN_ZOOM}>
          <Text style={styles.zoomButtonText}>−</Text>
        </Pressable>
        <Text>{Math.round(zoom * 100)}%</Text>
        <Pressable style={styles.zoomButton} onPress={() => setZoom((current) => adjustDiagramZoom(current, 1))} disabled={zoom >= DIAGRAM_MAX_ZOOM}>
          <Text style={styles.zoomButtonText}>＋</Text>
        </Pressable>
        <Pressable style={styles.resetButton} onPress={() => setZoom(1)} disabled={zoom === 1}>
          <Text style={styles.zoomButtonText}>リセット</Text>
        </Pressable>
      </View>
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
      <View style={[styles.diagramViewport, { height: diagramViewportHeight }]}>
        <View style={[styles.headerRow, { height: 32 }]}>
          <View style={[styles.cornerCell, { width: LEFT_MARGIN * zoom }]} />
          <ScrollView
            ref={headerScrollRef}
            style={styles.headerHorizontalScroll}
            horizontal
            showsHorizontalScrollIndicator={false}
            onScroll={(event) => syncHorizontalScroll(event.nativeEvent.contentOffset.x, 'header')}
            scrollEventThrottle={16}
          >
            <View style={[styles.timeHeader, { width: plotWidth, height: 32 }]}>
              {Array.from({ length: 25 }, (_, hour) => (
                <View key={`time-${hour}`} style={[styles.hourMark, { left: hour * 60 * zoom }]}>
                  <Text style={styles.hourLabel}>{String((startHour + hour) % 24).padStart(2, '0')}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
        <View style={styles.diagramBody}>
          <ScrollView
            ref={stationVerticalScrollRef}
            style={{ width: LEFT_MARGIN * zoom, flexGrow: 0, flexShrink: 0 }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            onScroll={(event) => syncVerticalScroll(event.nativeEvent.contentOffset.y, 'stations')}
            scrollEventThrottle={16}
          >
            <View style={{ height: plotHeight }}>
              {stations.map((station, index) => (
                <View key={station.id} style={[styles.stationRow, { top: index * ROW_HEIGHT * zoom, width: LEFT_MARGIN * zoom, height: ROW_HEIGHT * zoom }]}>
                  <Text style={[styles.stationName, { left: 4 * zoom, top: 14 * zoom, width: (LEFT_MARGIN - 10) * zoom }]} numberOfLines={1}>{station.name}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
          <ScrollView
            ref={plotVerticalScrollRef}
            style={styles.plotVerticalScroll}
            showsVerticalScrollIndicator
            nestedScrollEnabled
            onScroll={(event) => syncVerticalScroll(event.nativeEvent.contentOffset.y, 'plot')}
            scrollEventThrottle={16}
          >
            <ScrollView
              ref={plotHorizontalScrollRef}
              horizontal
              showsHorizontalScrollIndicator
              nestedScrollEnabled
              onScroll={(event) => syncHorizontalScroll(event.nativeEvent.contentOffset.x, 'plot')}
              scrollEventThrottle={16}
            >
              <View
                style={[styles.diagram, { width: plotWidth, height: plotHeight }]}
                onStartShouldSetResponder={(event) => findNearestTrain(LEFT_MARGIN + event.nativeEvent.locationX / zoom, event.nativeEvent.locationY / zoom) !== null}
                onResponderRelease={(event) => setSelectedTrainKey(findNearestTrain(LEFT_MARGIN + event.nativeEvent.locationX / zoom, event.nativeEvent.locationY / zoom))}
              >
                {Array.from({ length: 25 }, (_, hour) => (
                  <View key={`grid-${hour}`} style={[styles.hourLine, { left: hour * 60 * zoom }]} />
                ))}
                {stations.map((station, index) => (
                  <View key={station.id} style={[styles.stationRow, { top: index * ROW_HEIGHT * zoom, width: plotWidth, height: ROW_HEIGHT * zoom }]} />
                ))}
                {segments.map((segment) => (
                  <DiagramLine
                    key={segment.segmentKey}
                    segment={segment}
                    color={toOudDisplayColor(trainTypes[segment.trainType]?.color || '#64748b') || '#64748b'}
                    zoom={zoom}
                    selected={selectedTrainKey === segment.key}
                  />
                ))}
              </View>
            </ScrollView>
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modeContainer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 12 },
  zoomContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  zoomButton: { minWidth: 40, minHeight: 36, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, borderRadius: 6, backgroundColor: '#2563eb' },
  resetButton: { minHeight: 36, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, borderRadius: 6, backgroundColor: '#64748b' },
  zoomButtonText: { color: '#fff', fontWeight: '700' },
  modeLabel: { width: '100%', fontWeight: '700' },
  modeButton: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: '#64748b' },
  radioSelected: { borderWidth: 5, borderColor: '#2563eb' },
  diagramViewport: { overflow: 'hidden', borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#fff' },
  headerRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#cbd5e1' },
  cornerCell: { backgroundColor: '#f8fafc', borderRightWidth: 1, borderColor: '#cbd5e1' },
  timeHeader: { position: 'relative', backgroundColor: '#fff' },
  headerHorizontalScroll: { flex: 1 },
  hourMark: { position: 'absolute', top: 0, bottom: 0, width: 1 },
  diagramBody: { flex: 1, flexDirection: 'row' },
  plotVerticalScroll: { flex: 1 },
  diagram: { position: 'relative', backgroundColor: '#fff' },
  hourLine: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: '#e2e8f0' },
  hourLabel: { position: 'absolute', top: 4, left: -10, width: 24, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  stationRow: { position: 'absolute', left: 0, borderBottomWidth: 1, borderColor: '#e2e8f0' },
  stationName: { position: 'absolute', left: 4, top: 14, width: LEFT_MARGIN - 10, fontSize: 12, textAlign: 'right' },
  trainLine: { position: 'absolute', height: 1, transformOrigin: 'left center' },
  emptyText: { color: '#64748b' },
});
