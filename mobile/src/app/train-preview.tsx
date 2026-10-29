import { Animated, Modal, Pressable, StyleSheet, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useOudData } from '@/context/oud-data-context';
import type { Station, TrainData, TrainType } from '@shared/types/timetable';
import {
  getOudHeaderRows,
  getOudStationDisplayModes,
  getOudTrainDisplayCell,
  getOudTrainHeaderDisplay,
  getOrderedStations,
  toOudDisplayColor,
} from '@shared/utils/timetableDisplay';

const STATION_COLUMN_WIDTH = 60;
const TRAIN_COLUMN_WIDTH = 50;
const ROW_HEIGHT = 20;
const COLUMN_OVERSCAN = 24;
type TimetableDirection = 'down' | 'up';

type VirtualTimetableRow = {
  key: string;
  station: Station;
  stationIndex: number;
  mode: 'arrive' | 'railNumber' | 'departure';
  isFirstStationRow: boolean;
  stationRowSpan: number;
  isFirstBranchRow: boolean;
  branchBorderPosition?: 'top' | 'bottom';
};

function VirtualTimetableGrid({
  trains,
  trainTypes,
  stations,
  direction,
  theme,
}: {
  trains: TrainData[];
  trainTypes: TrainType[];
  stations: Station[];
  direction: TimetableDirection;
  theme: ReturnType<typeof useTheme>;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const horizontalOffset = useRef(new Animated.Value(0)).current;
  const verticalOffset = useRef(new Animated.Value(0)).current;
  const displayCellCache = useRef(new WeakMap<TrainData, Map<number, ReturnType<typeof getOudTrainDisplayCell>>>());
  const viewportWidth = Math.max(0, windowWidth - 32);
  const initialColumnCount = Math.ceil(Math.max(0, viewportWidth - STATION_COLUMN_WIDTH) / TRAIN_COLUMN_WIDTH);
  const [visibleColumns, setVisibleColumns] = useState({ start: 0, end: initialColumnCount + COLUMN_OVERSCAN * 2 });
  const latestColumns = useRef(visibleColumns);
  const shrinkColumnsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (shrinkColumnsTimer.current !== null) clearTimeout(shrinkColumnsTimer.current);
  }, []);
  const directionIndex = direction === 'down' ? 0 : 1;
  const columns = useMemo(() => trains.map((train) => getOudTrainHeaderDisplay(train, trainTypes, stations)), [stations, trainTypes, trains]);
  const fixedHeaderRows = useMemo(() => getOudHeaderRows(columns).slice(0, 4), [columns]);
  const outerDepartureRows = useMemo(() => [
    { key: 'outerDepartureStation', label: '始発', values: columns.map((column) => ({ trainKey: column.key, value: column.outerDeparture.name })) },
    { key: 'outerDepartureTime', label: '時刻', values: columns.map((column) => ({ trainKey: column.key, value: column.outerDeparture.time })) },
  ], [columns]);
  const footerRows = useMemo(() => [
    { key: 'outerArrivalStation', label: '終着', values: columns.map((column) => ({ trainKey: column.key, value: column.outerArrival.name })) },
    { key: 'outerArrivalTime', label: '時刻', values: columns.map((column) => ({ trainKey: column.key, value: column.outerArrival.time })) },
  ], [columns]);
  const rows = useMemo(() => stations.flatMap((station, stationIndex) => {
    const customDisplay = directionIndex === 0 ? station.customTimetableDisplay?.kudari : station.customTimetableDisplay?.nobori;
    const modes = getOudStationDisplayModes(station.layout, directionIndex, customDisplay, true);
    const coreIndex = station.branchCoreStationId === undefined ? -1 : stations.findIndex((candidate) => candidate.id === station.branchCoreStationId);
    return modes.map((mode, modeIndex): VirtualTimetableRow => ({
      key: `${station.id}-${mode}`, station, stationIndex, mode,
      isFirstStationRow: modeIndex === 0, stationRowSpan: modes.length,
      isFirstBranchRow: station.branchCoreStationId !== undefined && modeIndex === 0,
      branchBorderPosition: coreIndex >= 0 ? stationIndex < coreIndex ? 'bottom' : 'top' : undefined,
    }));
  }), [directionIndex, stations]);
  const tableWidth = STATION_COLUMN_WIDTH + trains.length * TRAIN_COLUMN_WIDTH;
  const onHorizontalScroll = useCallback((offset: number) => {
    const firstVisible = Math.max(0, Math.floor(Math.max(0, offset - STATION_COLUMN_WIDTH) / TRAIN_COLUMN_WIDTH));
    const lastVisible = Math.min(columns.length, Math.ceil((offset + viewportWidth - STATION_COLUMN_WIDTH) / TRAIN_COLUMN_WIDTH));
    const edgeBuffer = Math.max(2, Math.floor(COLUMN_OVERSCAN / 3));
    const current = latestColumns.current;
    if (firstVisible >= current.start + edgeBuffer && lastVisible <= current.end - edgeBuffer) return;
    const next = {
        start: Math.max(0, firstVisible - COLUMN_OVERSCAN),
        end: Math.min(columns.length, lastVisible + COLUMN_OVERSCAN),
      };
    latestColumns.current = next;
    setVisibleColumns((rendered) => ({
      start: Math.min(rendered.start, next.start),
      end: Math.max(rendered.end, next.end),
    }));
    if (shrinkColumnsTimer.current === null) {
      shrinkColumnsTimer.current = setTimeout(() => {
        setVisibleColumns(latestColumns.current);
        shrinkColumnsTimer.current = null;
      }, 120);
    }
  }, [columns.length, viewportWidth]);
  const horizontalScrollHandler = useMemo(() => Animated.event(
    [{ nativeEvent: { contentOffset: { x: horizontalOffset } } }],
    {
      useNativeDriver: true,
      listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => onHorizontalScroll(event.nativeEvent.contentOffset.x),
    },
  ), [horizontalOffset, onHorizontalScroll]);
  const verticalScrollHandler = useMemo(() => Animated.event(
    [{ nativeEvent: { contentOffset: { y: verticalOffset } } }],
    { useNativeDriver: true },
  ), [verticalOffset]);
  const renderHeaderCells = (values: { trainKey: string; value: string }[]) => (
    <>
      <View style={{ width: STATION_COLUMN_WIDTH + visibleColumns.start * TRAIN_COLUMN_WIDTH }} />
      {values.slice(visibleColumns.start, visibleColumns.end).map((cell, index) => {
        const column = columns[visibleColumns.start + index];
        return (
          <View key={cell.trainKey} style={[styles.trainCell, styles.headerCell]}>
            <ThemedText
              type="small"
              style={[styles.trainText, { color: toOudDisplayColor(column?.typeColor ?? '') || undefined }]}
              numberOfLines={1}
            >
              {cell.value}
            </ThemedText>
          </View>
        );
      })}
      <View style={{ width: Math.max(0, columns.length - visibleColumns.end) * TRAIN_COLUMN_WIDTH }} />
    </>
  );
  const renderTrainCells = (row: VirtualTimetableRow) => (
    <>
      <View style={{ width: STATION_COLUMN_WIDTH + visibleColumns.start * TRAIN_COLUMN_WIDTH }} />
      {trains.slice(visibleColumns.start, visibleColumns.end).map((train) => {
        const entry = train.time[row.stationIndex];
        const railNumber = row.station.railnumber[entry?.railNumberID ?? -1]?.ryakushou ?? '';
        let trainCells = displayCellCache.current.get(train);
        if (!trainCells) {
          trainCells = new Map();
          displayCellCache.current.set(train, trainCells);
        }
        let cell = trainCells.get(row.stationIndex);
        if (!cell) {
          cell = getOudTrainDisplayCell(train, row.stationIndex, railNumber);
          trainCells.set(row.stationIndex, cell);
        }
        const value = row.mode === 'arrive' ? cell.arrival : row.mode === 'departure' ? cell.departure : cell.railNumber;
        return (
          <View key={`${row.key}-${train.DiaLine}-${train.id}`} style={[styles.trainCell, styles.bodyCell, row.isFirstBranchRow && row.branchBorderPosition && getBranchLineStyle(row.branchBorderPosition)]}>
            <ThemedText type={row.mode === 'railNumber' ? 'small' : 'smallBold'} style={[styles.trainText, { color: toOudDisplayColor(trainTypes[train.type]?.color ?? '') || undefined }]}>{value}</ThemedText>
          </View>
        );
      })}
      <View style={{ width: Math.max(0, trains.length - visibleColumns.end) * TRAIN_COLUMN_WIDTH }} />
    </>
  );
  const renderOuterDepartureHeader = () => outerDepartureRows.map((row) => (
    <View key={row.key} style={styles.row}>
      {renderHeaderCells(row.values)}
    </View>
  ));
  const renderFooter = () => footerRows.map((row) => (
    <View key={row.key} style={styles.row}>
      {renderHeaderCells(row.values)}
    </View>
  ));

  return (
    <>
      <View style={styles.stickyHeaderViewport}>
        <Animated.View style={{ width: tableWidth, transform: [{ translateX: Animated.multiply(horizontalOffset, -1) }] }}>
          <View style={[styles.table, { width: tableWidth, borderColor: theme.textSecondary }]}>
            {fixedHeaderRows.map((row) => (
              <View key={row.key} style={styles.row}>
                {renderHeaderCells(row.values)}
              </View>
            ))}
          </View>
        </Animated.View>
        <ThemedView style={[styles.fixedColumn, styles.stickyFixedColumn, { backgroundColor: '#ffffff' }]} pointerEvents="none">
          {fixedHeaderRows.map((row) => (
          <View key={`fixed-${row.key}`} style={[styles.stationHeader, styles.headerCell, { height: ROW_HEIGHT }]}>
              <ThemedText type="smallBold" style={{ color: '#000000' }}>{row.label}</ThemedText>
            </View>
          ))}
        </ThemedView>
      </View>
      <View style={styles.tableViewport}>
        <Animated.ScrollView
          horizontal
          nestedScrollEnabled
          style={styles.horizontalBody}
          showsHorizontalScrollIndicator
          scrollEventThrottle={16}
          onScroll={horizontalScrollHandler}
        >
          <View style={[styles.table, styles.virtualTable, { width: tableWidth, borderColor: theme.textSecondary }]}>
            <Animated.FlatList
              data={rows}
              keyExtractor={(row) => row.key}
              style={styles.verticalList}
              renderItem={({ item: row }) => (
                <View style={styles.row}>
                  {renderTrainCells(row)}
                </View>
              )}
              getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
              initialNumToRender={Math.ceil(600 / ROW_HEIGHT)}
              maxToRenderPerBatch={32}
              updateCellsBatchingPeriod={16}
              windowSize={15}
              ListHeaderComponent={renderOuterDepartureHeader}
              ListFooterComponent={renderFooter}
              onScroll={verticalScrollHandler}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator
            />
          </View>
        </Animated.ScrollView>
        <ThemedView style={[styles.fixedColumn, { backgroundColor: '#ffffff' }]} pointerEvents="none">
          <Animated.View style={[styles.fixedColumnScroll, { transform: [{ translateY: Animated.multiply(verticalOffset, -1) }] }]}>
            {outerDepartureRows.map((row) => (
              <View key={`fixed-${row.key}`} style={[styles.stationHeader, styles.headerCell, { height: ROW_HEIGHT }]}>
                <ThemedText type="smallBold" style={{ color: '#000000' }}>{row.label}</ThemedText>
              </View>
            ))}
            {rows.filter((row) => row.isFirstStationRow).map((row) => (
              <View key={`fixed-${row.key}`} style={[styles.stationHeader, styles.bodyCell, styles.mergedStationCell, { height: row.stationRowSpan * ROW_HEIGHT }, row.isFirstBranchRow && row.branchBorderPosition && getBranchLineStyle(row.branchBorderPosition)]}>
                <ThemedText type="smallBold" style={{ color: '#000000' }} numberOfLines={1}>{row.station.name}</ThemedText>
                {row.stationRowSpan > 1 && rows.some((item) => item.station.id === row.station.id && item.mode === 'railNumber') && (
                  <ThemedText type="small" style={{ color: '#000000' }} numberOfLines={1}>発着番線</ThemedText>
                )}
              </View>
            ))}
            {footerRows.map((row) => (
              <View key={`fixed-${row.key}`} style={[styles.stationHeader, styles.headerCell, { height: ROW_HEIGHT }]}>
                <ThemedText type="smallBold" style={{ color: '#000000' }}>{row.label}</ThemedText>
              </View>
            ))}
          </Animated.View>
        </ThemedView>
      </View>
    </>
  );
}

export default function TrainPreviewScreen() {
  const { parsedData } = useOudData();
  const theme = useTheme();
  const [direction, setDirection] = useState<TimetableDirection>('down');
  const [selectedDia, setSelectedDia] = useState(1);
  const [isDiagramMenuOpen, setIsDiagramMenuOpen] = useState(false);
  const sourceTrains: TrainData[] = direction === 'down'
    ? (parsedData?.KudariData ?? [])
    : (parsedData?.NoboriData ?? []);
  const diagrams = parsedData?.Diagrams ?? [];
  const selectedDiagram = diagrams.find((diagram) => diagram.id + 1 === selectedDia);
  const trains = useMemo(() => sourceTrains.filter((train) => Number(train.DiaLine) === selectedDia).slice(0, 1000), [selectedDia, sourceTrains]);
  const stations = useMemo(() => parsedData
    ? getOrderedStations(parsedData.stations, direction === 'down' ? 'Kudari' : 'Nobori')
    : [], [direction, parsedData]);
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.directionControl}>
            <Pressable style={[styles.directionButton, { backgroundColor: theme.backgroundSelected }]} onPress={() => setIsDiagramMenuOpen(true)} disabled={!parsedData || diagrams.length <= 1}>
              <ThemedText style={styles.directionButtonText}>{selectedDiagram?.name ?? `ダイヤ${selectedDia}`} ▼</ThemedText>
            </Pressable>
            <Pressable style={[styles.directionButton, { backgroundColor: theme.backgroundSelected }, direction === 'down' && styles.activeDirectionButton]} onPress={() => setDirection('down')} disabled={!parsedData}>
              <ThemedText style={[styles.directionButtonText, direction === 'down' && styles.activeDirectionButtonText]}>下り</ThemedText>
            </Pressable>
            <Pressable style={[styles.directionButton, { backgroundColor: theme.backgroundSelected }, direction === 'up' && styles.activeDirectionButton]} onPress={() => setDirection('up')} disabled={!parsedData}>
              <ThemedText style={[styles.directionButtonText, direction === 'up' && styles.activeDirectionButtonText]}>上り</ThemedText>
            </Pressable>
          </View>
          <Modal visible={isDiagramMenuOpen} transparent animationType="fade" onRequestClose={() => setIsDiagramMenuOpen(false)}>
            <View style={styles.diagramMenuBackdrop}>
              <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsDiagramMenuOpen(false)} />
              <ThemedView style={styles.diagramMenu}>
                {diagrams.map((diagram) => (
                  <Pressable key={diagram.id} style={styles.diagramOption} onPress={() => { setSelectedDia(diagram.id + 1); setIsDiagramMenuOpen(false); }}>
                    <ThemedText type="small">{diagram.name}</ThemedText>
                  </Pressable>
                ))}
              </ThemedView>
            </View>
          </Modal>
          {trains.length > 0 && stations.length > 0 ? (
            <VirtualTimetableGrid key={`${direction}-${selectedDia}`} trains={trains} trainTypes={parsedData?.TrainType ?? []} stations={stations} direction={direction} theme={theme} />
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
  directionControl: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  directionButton: { minWidth: 80, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center', borderRadius: 8, backgroundColor: '#e5e7eb' },
  activeDirectionButton: { backgroundColor: '#2563eb' },
  directionButtonText: { fontWeight: '700' },
  diagramMenuBackdrop: { flex: 1, justifyContent: 'flex-start', paddingTop: 110, paddingHorizontal: 16, backgroundColor: 'rgba(0, 0, 0, 0.25)' },
  diagramMenu: { alignSelf: 'flex-start', minWidth: 160, maxHeight: '70%', borderRadius: 8, padding: 8, elevation: 5 },
  diagramOption: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  activeDirectionButtonText: { color: '#ffffff' },
  table: { borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#ffffff' },
  stickyHeaderViewport: { width: '100%', position: 'relative', overflow: 'hidden', backgroundColor: '#ffffff', zIndex: 3 },
  tableViewport: { flex: 1, width: '100%', position: 'relative', overflow: 'hidden' },
  horizontalBody: { flex: 1 },
  virtualTable: { flex: 1 },
  verticalList: { flex: 1 },
  fixedColumnScroll: { position: 'absolute', left: 0, top: 0 },
  fixedColumn: { position: 'absolute', left: 0, top: 0, bottom: 0, width: STATION_COLUMN_WIDTH, zIndex: 2, elevation: 2 },
  stickyFixedColumn: { top: 0, zIndex: 4 },
  row: { flexDirection: 'row' },
  stationHeader: {color: '#000000', width: STATION_COLUMN_WIDTH },
  trainHeader: { width: TRAIN_COLUMN_WIDTH },
  trainCell: { height: 20, width: TRAIN_COLUMN_WIDTH, alignItems: 'center' },
  stationSpacer: { height: 20 },
  mergedStationCell: { alignItems: 'flex-start', justifyContent: 'center', paddingLeft: 2 },
  trainText: { fontSize: 12, textAlign: 'center' },
  headerCell: { minHeight: 14, justifyContent: 'center', paddingHorizontal: 0, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#d1d5db', backgroundColor: '#ffffff' },
  bodyCell: { minHeight: 10, justifyContent: 'center', paddingHorizontal: 0, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  branchTop: { borderTopWidth: 4, borderTopColor: '#333333' },
  branchBottom: { borderBottomWidth: 4, borderBottomColor: '#333333' },
});

const getBranchLineStyle = (position?: "top" | "bottom") => (
  position === "bottom" ? styles.branchBottom : styles.branchTop
);
