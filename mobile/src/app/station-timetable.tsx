import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StationTimetable } from '@/components/station-timetable';
import { ThemedView } from '@/components/themed-view';

export default function StationTimetableScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <StationTimetable
            stationName="新大阪"
            trains={[
              {
                id: 's1',
                trainNumber: '1',
                trainType: '特急',
                direction: '上り',
                departure: '06:15',
                terminal: '東京',
                track: '1',
              },
              {
                id: 's2',
                trainNumber: '3',
                trainType: '新幹線',
                direction: '上り',
                arrival: '06:28',
                departure: '06:30',
                terminal: '東京',
                track: '2',
              },
              {
                id: 's3',
                trainNumber: '15',
                trainType: '普通',
                direction: '下り',
                arrival: '06:42',
                departure: '06:45',
                terminal: '大阪',
                track: '3',
              },
              {
                id: 's4',
                trainNumber: '17',
                trainType: '快速',
                direction: '下り',
                departure: '07:02',
                terminal: '京都',
                track: '4',
                note: '通過なし',
              },
            ]}
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
});