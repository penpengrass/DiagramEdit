import { Fragment, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import type { Diagrams, Station, TrainData, TrainType } from '@shared/types/timetable';
import {
  adjustDiagramZoom,
  DIAGRAM_BASE_SCALE,
  DIAGRAM_MAX_ZOOM,
  DIAGRAM_MIN_ZOOM,
  DIAGRAM_STATION_SCALE,
  filterTrainsByDiagram,
  findNearestDiagramTrainKey,
  getDiagramHitDistance,
  getDiagramLineSegments,
  getDiagramLineWidth,
  getDiagramSelectionOptions,
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
  diagrams: Diagrams[];
  kitenJikoku?: number;
};

function DiagramLine({ segment, color, scale, selected }: { segment: DiagramLineSegment; color: string; scale: number; selected: boolean }) {
  const dx = segment.end.x - segment.start.x;
  const dy = segment.end.y - segment.start.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  const lineThickness = getDiagramLineWidth(selected) * scale;
  const verticalOffset = segment.isBranchDwell ? 2 * scale : 0;
  const lineStyle = {
    backgroundColor: color,
    left: (segment.start.x - LEFT_MARGIN) * scale,
    top: segment.start.y * scale - lineThickness / 2,
    width: length * scale,
    height: lineThickness,
    transform: [{ rotate: `${angle}rad` }],
  };

  return (
    <Fragment>
      <View style={[styles.trainLine, lineStyle, { top: lineStyle.top - verticalOffset / 2 }]} />
      {segment.isBranchDwell && (
        <View style={[styles.trainLine, lineStyle, { top: lineStyle.top + verticalOffset / 2 }]} />
      )}
    </Fragment>
  );
}

export function DiagramView({ kudariTrains, noboriTrains, stations, trainTypes, diagrams, kitenJikoku = 0 }: Props) {
  const { height: windowHeight } = useWindowDimensions();
  const headerScrollRef = useRef<ScrollView>(null);
  const plotHorizontalScrollRef = useRef<ScrollView>(null);
  const stationVerticalScrollRef = useRef<ScrollView>(null);
  const plotVerticalScrollRef = useRef<ScrollView>(null);
  const horizontalOffsetRef = useRef(0);
  const verticalOffsetRef = useRef(0);
  const [displayMode, setDisplayMode] = useState<DiagramDisplayMode>('both');
  const [selectedDia, setSelectedDia] = useState('1');
  const [isDiagramMenuOpen, setIsDiagramMenuOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const renderScale = DIAGRAM_BASE_SCALE * zoom;
  const [selectedTrainKey, setSelectedTrainKey] = useState<string | null>(null);
  const startHour = getDiagramStartHour(kitenJikoku);
  const diagramOptions = useMemo(() => getDiagramSelectionOptions(diagrams), [diagrams]);
  const selectedKudariTrains = useMemo(
    () => filterTrainsByDiagram(kudariTrains, selectedDia),
    [kudariTrains, selectedDia],
  );
  const selectedNoboriTrains = useMemo(
    () => filterTrainsByDiagram(noboriTrains, selectedDia),
    [noboriTrains, selectedDia],
  );
  const trainGroups = useMemo(
    () => getDiagramTrainGroups(selectedKudariTrains, selectedNoboriTrains, displayMode),
    [displayMode, selectedKudariTrains, selectedNoboriTrains],
  );
  const segments = useMemo(
    () => getDiagramLineSegments(trainGroups, stations, ROW_HEIGHT, kitenJikoku, LEFT_MARGIN),
    [kitenJikoku, stations, trainGroups],
  );
  const plotWidth = (DIAGRAM_WIDTH - LEFT_MARGIN) * renderScale;
  const plotHeight = stations.length * ROW_HEIGHT * renderScale;
  const stationColumnWidth = LEFT_MARGIN * DIAGRAM_STATION_SCALE;
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
    findNearestDiagramTrainKey(segments, { x, y }, getDiagramHitDistance(renderScale));

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
      <View style={styles.diagramSelector}>
          <Text style={styles.selectorLabel}>ダイヤ</Text>
          <Pressable style={styles.diagramPicker} onPress={() => setIsDiagramMenuOpen(true)} disabled={diagramOptions.length <= 1}>
            <Text>{diagramOptions.find((option) => option.value === selectedDia)?.label ?? ''}</Text>
            <Text style={styles.pickerArrow}>▼</Text>
          </Pressable>
      </View>
      <Modal
        visible={isDiagramMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDiagramMenuOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsDiagramMenuOpen(false)} />
          <View style={styles.diagramMenu}>
            <Text style={styles.diagramMenuTitle}>ダイヤを選択</Text>
            {diagramOptions.map((option) => (
              <Pressable
                key={option.value}
                style={[styles.diagramOption, selectedDia === option.value && styles.diagramOptionSelected]}
                onPress={() => {
                  setSelectedDia(option.value);
                  setSelectedTrainKey(null);
                  setIsDiagramMenuOpen(false);
                }}
              >
                <Text style={selectedDia === option.value ? styles.diagramOptionTextSelected : undefined}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
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
          <View style={[styles.cornerCell, { width: stationColumnWidth }]} />
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
                <View key={`time-${hour}`} style={[styles.hourMark, { left: hour * 60 * renderScale }]}>
                  <Text style={styles.hourLabel}>{String((startHour + hour) % 24).padStart(2, '0')}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
        <View style={styles.diagramBody}>
          <ScrollView
            ref={stationVerticalScrollRef}
            style={{ width: stationColumnWidth, flexGrow: 0, flexShrink: 0 }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            onScroll={(event) => syncVerticalScroll(event.nativeEvent.contentOffset.y, 'stations')}
            scrollEventThrottle={16}
          >
            <View style={{ height: plotHeight }}>
              {stations.map((station, index) => (
                <View key={station.id} style={[styles.stationRow, { top: index * ROW_HEIGHT * renderScale, width: stationColumnWidth, height: ROW_HEIGHT * renderScale }]}>
                  <Text style={[styles.stationName, { left: 4 * DIAGRAM_STATION_SCALE, top: 14 * renderScale, width: (LEFT_MARGIN - 10) * DIAGRAM_STATION_SCALE }]} numberOfLines={1}>{station.name}</Text>
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
                onStartShouldSetResponder={(event) => findNearestTrain(LEFT_MARGIN + event.nativeEvent.locationX / renderScale, event.nativeEvent.locationY / renderScale) !== null}
                onResponderRelease={(event) => setSelectedTrainKey(findNearestTrain(LEFT_MARGIN + event.nativeEvent.locationX / renderScale, event.nativeEvent.locationY / renderScale))}
              >
                {Array.from({ length: 25 }, (_, hour) => (
                  <View key={`grid-${hour}`} style={[styles.hourLine, { left: hour * 60 * renderScale }]} />
                ))}
                {stations.map((station, index) => (
                  <View key={station.id} style={[styles.stationLine, { top: (index * ROW_HEIGHT + ROW_HEIGHT / 2) * renderScale, width: plotWidth }]} />
                ))}
                {segments.map((segment) => (
                  <DiagramLine
                    key={segment.segmentKey}
                    segment={segment}
                    color={toOudDisplayColor(trainTypes[segment.trainType]?.color || '#64748b') || '#64748b'}
                    scale={renderScale}
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
  diagramSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  selectorLabel: { alignSelf: 'center', fontWeight: '700' },
  diagramPicker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minWidth: 150, minHeight: 40, paddingHorizontal: 12, borderWidth: 1, borderColor: '#94a3b8', borderRadius: 6 },
  pickerArrow: { marginLeft: 16, color: '#64748b' },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0, 0, 0, 0.35)' },
  diagramMenu: { maxHeight: '80%', padding: 16, borderRadius: 12, backgroundColor: '#fff' },
  diagramMenuTitle: { fontWeight: '700', marginBottom: 8 },
  diagramOption: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  diagramOptionSelected: { backgroundColor: 'rgba(37, 99, 235, 0.12)' },
  diagramOptionTextSelected: { color: '#2563eb', fontWeight: '700' },
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
  stationRow: { position: 'absolute', left: 0 },
  stationLine: { position: 'absolute', left: 0, height: 1, backgroundColor: '#d0d0d0' },
  stationName: { position: 'absolute', left: 4, top: 14, width: LEFT_MARGIN - 10, fontSize: 12, textAlign: 'right' },
  trainLine: { position: 'absolute', height: 1, transformOrigin: 'left center' },
  emptyText: { color: '#64748b' },
});
