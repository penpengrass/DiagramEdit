import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { Diagrams, Station, TrainData, TrainType } from '@shared/types/timetable';
import {
  filterTrainsByDiagram,
  getDiagramSelectionOptions,
} from '@shared/utils/diagram';
import {
  getRunningPositionLayout,
  getRunningPositionTrains,
  type RunningPositionTrain,
} from '@shared/utils/runningPosition';
import { toOudDisplayColor } from '@shared/utils/timetableDisplay';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  kudariTrains: TrainData[];
  noboriTrains: TrainData[];
  stations: Station[];
  trainTypes: TrainType[];
  diagrams: Diagrams[];
};

function getCurrentTimeValue(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function isBranchSection(stations: Station[], sectionIndex: number): boolean {
  const station = stations[sectionIndex];
  const nextStation = stations[sectionIndex + 1];
  if (!station || !nextStation) return false;

  return (nextStation.branchCoreStationId !== undefined
      && nextStation.branchCoreStationId < nextStation.id)
    || (station.branchCoreStationId !== undefined
      && station.branchCoreStationId > station.id);
}

export function RunningPositionView({
  kudariTrains,
  noboriTrains,
  stations,
  trainTypes,
  diagrams,
}: Props) {
  const theme = useTheme();
  const [displayTime, setDisplayTime] = useState(getCurrentTimeValue);
  const [selectedDiagram, setSelectedDiagram] = useState('1');
  const [isDiagramMenuOpen, setIsDiagramMenuOpen] = useState(false);
  const layout = useMemo(() => getRunningPositionLayout(stations), [stations]);
  const diagramOptions = useMemo(() => getDiagramSelectionOptions(diagrams), [diagrams]);
  const selectedKudariTrains = useMemo(
    () => filterTrainsByDiagram(kudariTrains, selectedDiagram),
    [kudariTrains, selectedDiagram],
  );
  const selectedNoboriTrains = useMemo(
    () => filterTrainsByDiagram(noboriTrains, selectedDiagram),
    [noboriTrains, selectedDiagram],
  );
  const visibleTrains = useMemo(
    () => getRunningPositionTrains(
      selectedKudariTrains,
      selectedNoboriTrains,
      stations,
      displayTime,
    ),
    [selectedKudariTrains, selectedNoboriTrains, stations, displayTime],
  );
  const trainsByPosition = useMemo(() => {
    const positions = new Map<string, RunningPositionTrain[]>();
    visibleTrains.forEach((train) => {
      const key = `${train.direction}-${train.positionType}-${train.positionIndex}`;
      positions.set(key, [...(positions.get(key) ?? []), train]);
    });
    return positions;
  }, [visibleTrains]);

  const renderTrainBadges = (trains: RunningPositionTrain[]) => trains.map((train) => {
    const trainType = trainTypes[train.trainType];
    const color = toOudDisplayColor(trainType?.color ?? '#34495e') || '#34495e';
    const typeLabel = trainType?.ryakushou || trainType?.name || '種別未定';
    const label = [train.trainNumber.trim(), typeLabel, train.destination]
      .filter(Boolean)
      .join(' ');

    return (
      <View key={train.key} style={styles.trainBadge}>
        <Text style={[styles.trainLabel, { color, borderColor: color }]}>{label}</Text>
      </View>
    );
  });

  if (!layout.stations.length) {
    return <Text style={styles.emptyText}>先にOUD2ファイルを読み込んでください。</Text>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <View style={styles.timeControl}>
          <Text style={styles.controlLabel}>表示時刻</Text>
          <TextInput
            accessibilityLabel="表示時刻"
            style={styles.timeInput}
            value={displayTime}
            onChangeText={(value) => setDisplayTime(value.replace(/[^\d:]/g, '').slice(0, 5))}
            placeholder="HH:mm"
            keyboardType="numbers-and-punctuation"
            maxLength={5}
          />
        </View>
        <View style={styles.diagramControl}>
          <Text style={styles.controlLabel}>ダイヤ</Text>
          <Pressable
            accessibilityRole="button"
            style={styles.diagramPicker}
            onPress={() => setIsDiagramMenuOpen(true)}
            disabled={diagramOptions.length <= 1}
          >
            <Text numberOfLines={1} style={styles.diagramPickerText}>
              {diagramOptions.find((option) => option.value === selectedDiagram)?.label ?? ''}
            </Text>
            <Text style={styles.pickerArrow}>▼</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.directionLabels}>
        <Text style={[styles.directionLabel, { color: theme.textSecondary }]}>上り列車</Text>
        <Text style={[styles.routeLabel, { color: theme.textSecondary }]}>駅・駅間</Text>
        <Text style={[styles.directionLabel, styles.directionLabelRight, { color: theme.textSecondary }]}>下り列車</Text>
      </View>

      <ScrollView
        style={styles.stationScroll}
        contentContainerStyle={styles.stationList}
        nestedScrollEnabled
      >
        {layout.stations.map((station, index) => {
          const section = layout.sections[index];
          const hasBranchGap = section ? isBranchSection(stations, index) : false;

          return (
            <View key={`${station.id}-${index}`}>
              <View style={styles.stationRow}>
                <View style={[styles.trainLane, styles.leftLane]}>
                  {renderTrainBadges(trainsByPosition.get(`nobori-station-${index}`) ?? [])}
                </View>
                <View style={styles.stationColumn}>
                  <View style={styles.stationMarkerRow}>
                    <View style={styles.stationHorizontalLine} />
                    <View style={styles.stationMarker} />
                    <View style={styles.stationHorizontalLine} />
                  </View>
                  <Text style={[styles.stationName, { color: theme.text }]}>{station.name}</Text>
                </View>
                <View style={[styles.trainLane, styles.rightLane]}>
                  {renderTrainBadges(trainsByPosition.get(`kudari-station-${index}`) ?? [])}
                </View>
              </View>

              {section && (
                <View
                  key={section.id}
                  accessibilityLabel={`${section.fromStationName}から${section.toStationName}の駅間`}
                  style={styles.sectionRow}
                >
                  <View style={[styles.trainLane, styles.leftLane]}>
                    {renderTrainBadges(
                      trainsByPosition.get(`nobori-section-${section.sectionIndex}`) ?? [],
                    )}
                  </View>
                  <View style={styles.sectionColumn}>
                    {!hasBranchGap && <View style={styles.sectionLine} />}
                  </View>
                  <View style={[styles.trainLane, styles.rightLane]}>
                    {renderTrainBadges(
                      trainsByPosition.get(`kudari-section-${section.sectionIndex}`) ?? [],
                    )}
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <Modal
        visible={isDiagramMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDiagramMenuOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setIsDiagramMenuOpen(false)}
          />
          <View style={styles.diagramMenu}>
            <Text style={styles.menuTitle}>ダイヤを選択</Text>
            <ScrollView>
              {diagramOptions.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.diagramOption,
                    selectedDiagram === option.value && styles.diagramOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedDiagram(option.value);
                    setIsDiagramMenuOpen(false);
                  }}
                >
                  <Text
                    style={selectedDiagram === option.value
                      ? styles.diagramOptionTextSelected
                      : styles.diagramOptionText}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 16 },
  timeControl: { gap: 6 },
  controlLabel: { fontWeight: '700', color: '#334155' },
  timeInput: {
    minWidth: 100,
    minHeight: 40,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 6,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  diagramControl: { flex: 1, minWidth: 140, gap: 6 },
  diagramPicker: {
    minHeight: 40,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
  },
  diagramPickerText: { flex: 1, color: '#0f172a' },
  pickerArrow: { marginLeft: 8, color: '#64748b' },
  directionLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
  },
  directionLabel: { flex: 1, fontSize: 12, fontWeight: '700' },
  directionLabelRight: { textAlign: 'right' },
  stationScroll: { flex: 1, minHeight: 0 },
  stationList: { paddingBottom: 16 },
  routeLabel: { width: 96, textAlign: 'center', fontSize: 12, fontWeight: '700' },
  stationRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center' },
  trainLane: { flex: 1, gap: 4, justifyContent: 'center' },
  leftLane: { alignItems: 'flex-end', paddingRight: 4 },
  rightLane: { alignItems: 'flex-start', paddingLeft: 4 },
  stationColumn: { width: 96, alignItems: 'center', justifyContent: 'center' },
  stationMarkerRow: { width: '100%', height: 14, flexDirection: 'row', alignItems: 'center' },
  stationHorizontalLine: { flex: 1, height: 1, backgroundColor: '#d0d0d0' },
  stationMarker: { width: 9, height: 9, borderRadius: 5, borderWidth: 1, borderColor: '#64748b', backgroundColor: '#fff' },
  stationName: { maxWidth: 96, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  sectionRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center' },
  sectionColumn: { width: 96, height: 48, alignItems: 'center', justifyContent: 'center' },
  sectionLine: { width: 1, height: '100%', backgroundColor: '#d0d0d0' },
  trainBadge: { maxWidth: '100%' },
  trainLabel: {
    maxWidth: '100%',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderWidth: 1,
    borderRadius: 4,
    backgroundColor: '#fff',
    fontSize: 10,
    textAlign: 'center',
  },
  emptyText: { color: '#64748b', paddingVertical: 12 },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0, 0, 0, 0.35)' },
  diagramMenu: { maxHeight: '80%', padding: 16, borderRadius: 12, backgroundColor: '#fff' },
  menuTitle: { marginBottom: 8, color: '#0f172a', fontWeight: '700' },
  diagramOption: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  diagramOptionSelected: { backgroundColor: '#2563eb' },
  diagramOptionText: { color: '#0f172a' },
  diagramOptionTextSelected: { color: '#fff', fontWeight: '700' },
});
