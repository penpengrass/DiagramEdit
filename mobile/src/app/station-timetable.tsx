import { useState } from 'react';
import { Button, FlatList, Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StationTimetable } from '@/components/station-timetable';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useOudData } from '@/context/oud-data-context';
import { getStationTimetable } from '@shared/utils/stationTimetable';

type Direction = 'down' | 'up';

export default function StationTimetableScreen() {
  const { parsedData } = useOudData();
  const [selectedStation, setSelectedStation] = useState(1);
  const [selectedDia, setSelectedDia] = useState(1);
  const [direction, setDirection] = useState<Direction>('down');
  const [isStationMenuOpen, setIsStationMenuOpen] = useState(false);

  const stationCount = parsedData?.stations.length ?? 0;
  const stationNumber = Math.min(Math.max(selectedStation, 1), Math.max(stationCount, 1));
  const station = parsedData?.stations[stationNumber - 1];
  const timetable = parsedData
    ? getStationTimetable({
      kudariTrainData: parsedData.KudariData,
      noboriTrainData: parsedData.NoboriData,
      types: parsedData.TrainType,
      stations: parsedData.stations,
      selectedStation: stationNumber,
      selectedDia,
      direction,
    })
    : [];

  const trains = timetable.map((row, index) => ({
    id: `${direction}-${row.trainNumber}-${row.hour}-${row.minutes}-${index}`,
    trainNumber: row.trainNumber,
    trainType: row.typeName,
    direction: direction === 'down' ? '下り' as const : '上り' as const,
    departure: `${row.hour}${String(row.minutes).padStart(2, '0')}`,
    terminal: row.terminal,
  }));

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedView style={styles.controls}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="駅を選択"
              style={styles.stationSelector}
              onPress={() => setIsStationMenuOpen(true)}
              disabled={!parsedData || stationCount === 0}
            >
              <ThemedText type="smallBold">{station?.name ?? '駅を選択'}</ThemedText>
              <ThemedText type="small">▼</ThemedText>
            </Pressable>
            <Button
              title={direction === 'down' ? '下り' : '上り'}
              onPress={() => setDirection(direction === 'down' ? 'up' : 'down')}
              disabled={!parsedData}
            />
            <Button
              title={`ダイヤ${selectedDia}`}
              onPress={() => setSelectedDia(selectedDia >= (parsedData?.Diagrams.length ?? 1) ? 1 : selectedDia + 1)}
              disabled={!parsedData || (parsedData.Diagrams.length ?? 0) <= 1}
            />
          </ThemedView>
          <Modal
            visible={isStationMenuOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setIsStationMenuOpen(false)}
          >
            <Pressable style={styles.modalBackdrop} onPress={() => setIsStationMenuOpen(false)}>
              <ThemedView style={styles.stationMenu}>
                <ThemedText type="subtitle">駅を選択</ThemedText>
                <FlatList
                  data={parsedData?.stations ?? []}
                  keyExtractor={(item) => String(item.id)}
                  renderItem={({ item, index }) => (
                    <Pressable
                      accessibilityRole="button"
                      style={[styles.stationOption, index + 1 === stationNumber && styles.selectedStationOption]}
                      onPress={() => {
                        setSelectedStation(index + 1);
                        setIsStationMenuOpen(false);
                      }}
                    >
                      <ThemedText type="small">{item.name}</ThemedText>
                    </Pressable>
                  )}
                />
              </ThemedView>
            </Pressable>
          </Modal>
          <StationTimetable
            stationName={station?.name ?? '駅時刻表'}
            trains={trains}
          />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  controls: {
    gap: 8,
    marginBottom: 16,
  },
  stationSelector: {
    minHeight: 44,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#9ca3af',
    borderRadius: 8,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  stationMenu: {
    maxHeight: '80%',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  stationOption: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  selectedStationOption: {
    backgroundColor: 'rgba(156, 163, 175, 0.2)',
  },
});