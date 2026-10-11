import { useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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

function adjustTimeByMinutes(time: string, adjustment: number): string {
  const [hours, minutes] = time.split(':').map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return time;

  const totalMinutes = (hours * 60 + minutes + adjustment + 24 * 60) % (24 * 60);
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
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
  const [displayHour, displayMinute] = displayTime.split(':');
  const [draftTime, setDraftTime] = useState(displayTime);
  const [selectedDiagram, setSelectedDiagram] = useState('1');
  const [isDiagramMenuOpen, setIsDiagramMenuOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);
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
          <View style={styles.timeInputRow}>
            {([
              { label: '時間', value: displayHour, adjustment: 60 },
              { label: '分', value: displayMinute, adjustment: 1 },
            ] as const).map(({ label, value, adjustment }, index) => (
              <View key={label} style={styles.timeAdjuster}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${label}を戻す`}
                  style={[styles.timeAdjusterButton, styles.timeAdjusterButtonLeft]}
                  onPress={() => setDisplayTime((time) => adjustTimeByMinutes(time, -adjustment))}
                >
                  <Text style={styles.timeAdjusterArrow}>←</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${label} ${value}。タップして時刻を選択`}
                  style={styles.timePickerButton}
                  onPress={() => {
                    setDraftTime(displayTime);
                    setIsTimePickerOpen(true);
                  }}
                >
                  <Text style={styles.timePickerButtonText}>{value}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${label}を進める`}
                  style={[styles.timeAdjusterButton, styles.timeAdjusterButtonRight]}
                  onPress={() => setDisplayTime((time) => adjustTimeByMinutes(time, adjustment))}
                >
                  <Text style={styles.timeAdjusterArrow}>→</Text>
                </Pressable>
                {index === 0 && <Text style={styles.timeSeparator}>:</Text>}
              </View>
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="現在時刻に設定"
              style={styles.currentTimeButton}
              onPress={() => setDisplayTime(getCurrentTimeValue())}
            >
              <Text style={styles.currentTimeButtonText}>現在時刻</Text>
            </Pressable>
          </View>
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
        visible={isTimePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsTimePickerOpen(false)}
        onShow={() => {
          const [hour, minute] = draftTime.split(':').map(Number);
          hourScrollRef.current?.scrollTo({ y: Math.max(0, hour * 40 - 100), animated: false });
          minuteScrollRef.current?.scrollTo({ y: Math.max(0, minute * 40 - 100), animated: false });
        }}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setIsTimePickerOpen(false)}
          />
          <View style={styles.timePickerDialog}>
            <Text style={styles.menuTitle}>時刻を選択</Text>
            <View style={styles.timePickerColumns}>
              {([
                { label: '時', count: 24, ref: hourScrollRef, part: 0 },
                { label: '分', count: 60, ref: minuteScrollRef, part: 1 },
              ] as const).map(({ label, count, ref, part }) => (
                <View key={label} style={styles.timePickerColumn}>
                  <Text style={styles.timePickerColumnLabel}>{label}</Text>
                  <ScrollView
                    ref={ref}
                    style={styles.timePickerList}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator
                  >
                    {Array.from({ length: count }, (_, value) => {
                      const [hour, minute] = draftTime.split(':').map(Number);
                      const isSelected = (part === 0 ? hour : minute) === value;
                      const formattedValue = String(value).padStart(2, '0');

                      return (
                        <Pressable
                          key={value}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected }}
                          style={[
                            styles.timePickerOption,
                            isSelected && styles.timePickerOptionSelected,
                          ]}
                          onPress={() => {
                            const nextHour = part === 0 ? value : hour;
                            const nextMinute = part === 1 ? value : minute;
                            setDraftTime(
                              `${String(nextHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`,
                            );
                          }}
                        >
                          <Text
                            style={[
                              styles.timePickerOptionText,
                              isSelected && styles.timePickerOptionTextSelected,
                            ]}
                          >
                            {formattedValue}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              ))}
            </View>
            <View style={styles.timePickerActions}>
              <Pressable
                accessibilityRole="button"
                style={styles.timePickerCancel}
                onPress={() => setIsTimePickerOpen(false)}
              >
                <Text style={styles.timePickerCancelText}>キャンセル</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={styles.timePickerConfirm}
                onPress={() => {
                  setDisplayTime(draftTime);
                  setIsTimePickerOpen(false);
                }}
              >
                <Text style={styles.timePickerConfirmText}>決定</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
  timeInputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  controlLabel: { fontWeight: '700', color: '#334155' },
  timePickerButton: {
    minWidth: 34,
    minHeight: 40,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  timePickerButtonText: { color: '#0f172a', fontSize: 16, fontVariant: ['tabular-nums'] },
  timeAdjuster: { flexDirection: 'row', alignItems: 'center' },
  timeAdjusterButton: {
    minWidth: 28,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#94a3b8',
    backgroundColor: '#f3f6f8',
  },
  timeAdjusterButtonLeft: { borderTopLeftRadius: 6, borderBottomLeftRadius: 6, borderRightWidth: 0 },
  timeAdjusterButtonRight: { borderTopRightRadius: 6, borderBottomRightRadius: 6, borderLeftWidth: 0 },
  timeAdjusterArrow: { color: '#334155', fontSize: 15, lineHeight: 20 },
  timeSeparator: { marginHorizontal: 3, color: '#334155', fontSize: 16, fontWeight: '700' },
  currentTimeButton: {
    minHeight: 40,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
  },
  currentTimeButtonText: { color: '#fff', fontWeight: '600' },
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
  timePickerDialog: { width: '100%', maxWidth: 360, alignSelf: 'center', padding: 16, borderRadius: 12, backgroundColor: '#fff' },
  timePickerColumns: { flexDirection: 'row', gap: 16 },
  timePickerColumn: { flex: 1, alignItems: 'center' },
  timePickerColumnLabel: { marginBottom: 6, color: '#475569', fontWeight: '700' },
  timePickerList: { height: 240, width: '100%' },
  timePickerOption: { height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  timePickerOptionSelected: { backgroundColor: '#2563eb' },
  timePickerOptionText: { color: '#0f172a', fontSize: 16 },
  timePickerOptionTextSelected: { color: '#fff', fontWeight: '700' },
  timePickerActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
  timePickerCancel: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 12 },
  timePickerCancelText: { color: '#475569', fontWeight: '600' },
  timePickerConfirm: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 6, backgroundColor: '#2563eb' },
  timePickerConfirmText: { color: '#fff', fontWeight: '700' },
  menuTitle: { marginBottom: 8, color: '#0f172a', fontWeight: '700' },
  diagramOption: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  diagramOptionSelected: { backgroundColor: '#2563eb' },
  diagramOptionText: { color: '#0f172a' },
  diagramOptionTextSelected: { color: '#fff', fontWeight: '700' },
});
