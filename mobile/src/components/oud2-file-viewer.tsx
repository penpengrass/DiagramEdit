import { Button, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useOudData } from '@/context/oud-data-context';

export function Oud2FileViewer() {
  const { fileName, parsedData, isLoading, error, openFile } = useOudData();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle" style={styles.title}>
        OUD2ファイル閲覧
      </ThemedText>

      <Button
        title={isLoading ? '読み込み中...' : 'ファイルを開く'}
        onPress={openFile}
        disabled={isLoading}
      />

      <ThemedText type="small" style={styles.fileName}>
        選択中: {fileName}
      </ThemedText>

      {error ? (
        <ThemedText type="small" style={styles.errorText}>
          {error}
        </ThemedText>
      ) : null}

      {parsedData ? (
        <ThemedView style={styles.summaryBox}>
          <ThemedText type="smallBold">駅数: {parsedData.stations.length}</ThemedText>
          <ThemedText type="smallBold">下り列車: {parsedData.KudariData.length}</ThemedText>
          <ThemedText type="smallBold">上り列車: {parsedData.NoboriData.length}</ThemedText>
          <ThemedText type="smallBold">種別数: {parsedData.TrainType.length}</ThemedText>
        </ThemedView>
      ) : (
        <ThemedView style={styles.emptyBox}>
          <ThemedText type="small" style={styles.emptyText}>
            まだファイルが読み込まれていません。
          </ThemedText>
        </ThemedView>
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
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  fileName: {
    opacity: 0.7,
  },
  errorText: {
    color: '#dc2626',
  },
  summaryBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    padding: Spacing.two,
    borderRadius: 12,
  },
  emptyBox: {
    padding: Spacing.three,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    opacity: 0.7,
  },
});
