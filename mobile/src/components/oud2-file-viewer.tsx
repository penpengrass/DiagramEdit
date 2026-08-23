import { useMemo, useState } from 'react';
import { Button, StyleSheet, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { parseOud } from '@shared/parsers/oudParser';
import type { OudData } from '@shared/types/timetable';
import { formatTime } from '@shared/utils/Time';

const OUD_FILE_EXTENSIONS = ['.oud', '.oud2'];

function isAllowedOudFile(fileName: string): boolean {
  const lowerName = fileName.toLowerCase();
  return OUD_FILE_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
}

function looksLikeOudText(text: string): boolean {
  const normalized = text.split(String.fromCharCode(0)).join('');
  return /FileType=|Rosenmei=|Eki\.|Ressya\.|Ressyasyubetsu\./.test(normalized);
}

async function readOudFileContent(uri: string): Promise<string> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  const utf8Text = new TextDecoder('utf-8').decode(bytes);
  if (looksLikeOudText(utf8Text)) {
    return utf8Text;
  }

  try {
    const shiftJisText = new TextDecoder('shift-jis').decode(bytes);
    if (looksLikeOudText(shiftJisText)) {
      return shiftJisText;
    }
  } catch {
    // no-op: fallback to utf8 if Shift-JIS detection fails
  }

  return utf8Text;
}

export function Oud2FileViewer() {
  const [fileName, setFileName] = useState('未選択');
  const [parsedData, setParsedData] = useState<OudData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenFile = async () => {
    try {
      setError(null);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/plain','.oud2', 'application/octet-stream', '*/*'],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const pickedName = asset.name ?? 'oud2ファイル';

      if (!isAllowedOudFile(pickedName)) {
        setFileName(pickedName);
        setError('OUD/OUD2 ファイルのみ選択できます。拡張子が .oud または .oud2 のファイルを選んでください。');
        setParsedData(null);
        return;
      }

      setFileName(pickedName);
      setIsLoading(true);

      const text = await readOudFileContent(asset.uri);
      const parsed = parseOud(text, pickedName);
      setParsedData(parsed);
    } catch (e) {
      console.error('OUD2 file read failed:', e);
      setError('ファイルを読み込めませんでした。OUD/OUD2 ファイル (.oud, .oud2) を選んでください。');
      setParsedData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const stationPreview = useMemo(() => parsedData?.stations?.slice(0, 74) ?? [], [parsedData]);
  const trainPreview = useMemo(() => {
    const trains = [...(parsedData?.KudariData ?? []), ...(parsedData?.NoboriData ?? [])];
    return trains.slice(5, 18);
  }, [parsedData]);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle" style={styles.title}>
        OUD2ファイル閲覧
      </ThemedText>

      <Button
        title={isLoading ? '読み込み中...' : 'ファイルを開く'}
        onPress={handleOpenFile}
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
        <>
          <ThemedView style={styles.summaryBox}>
            <ThemedText type="smallBold">駅数: {parsedData.stations.length}</ThemedText>
            <ThemedText type="smallBold">下り列車: {parsedData.KudariData.length}</ThemedText>
            <ThemedText type="smallBold">上り列車: {parsedData.NoboriData.length}</ThemedText>
            <ThemedText type="smallBold">種別数: {parsedData.TrainType.length}</ThemedText>
          </ThemedView>

          <ThemedView style={styles.sectionBox}>
            <ThemedText type="smallBold" style={styles.sectionTitle}>
              駅一覧
            </ThemedText>
            <View style={styles.chipRow}>
              {stationPreview.map((station: any) => (
                <ThemedView key={station.id} style={styles.chip}>
                  <ThemedText type="small" style={styles.chipText}>
                    {station.name}
                  </ThemedText>
                </ThemedView>
              ))}
            </View>
          </ThemedView>

          <ThemedView style={styles.sectionBox}>
            <ThemedText type="smallBold" style={styles.sectionTitle}>
              列車プレビュー
            </ThemedText>
            {trainPreview.map((train: any, index: number) => {
              const trainType = parsedData.TrainType[train.type]?.ryakushou ?? '種別未定';
              const direction = train.dir === 0 ? '下り' : '上り';
              const visibleTimes = train.time.slice(0, 30);

              return (
                <ThemedView key={`${train.number}-${index}`} style={styles.trainCard}>
                  <ThemedText type="smallBold" style={styles.trainHeader}>
                    {direction} {train.number} / {trainType}
                  </ThemedText>

                  <View style={styles.timeRow}>
                    {visibleTimes.map((entry: any, timeIndex: number) => (
                      <View key={`${train.number}-${timeIndex}`} style={styles.timeCell}>
                        <ThemedText type="small" style={styles.timeLabel}>
                          {entry.stop}
                        </ThemedText>
                        <ThemedText type="smallBold" style={styles.timeValue}>
                          {entry.arrive ? formatTime(entry.arrive) : entry.departure ? formatTime(entry.departure) : '---'}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                </ThemedView>
              );
            })}
          </ThemedView>
        </>
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
  sectionBox: {
    padding: Spacing.two,
    borderRadius: 12,
    gap: Spacing.one,
  },
  sectionTitle: {
    marginBottom: Spacing.half,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  chip: {
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.half,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
  },
  chipText: {
    fontSize: 12,
  },
  trainCard: {
    borderRadius: 12,
    padding: Spacing.two,
    gap: Spacing.one,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  trainHeader: {
    fontSize: 13,
  },
  timeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  timeCell: {
    minWidth: 54,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  timeLabel: {
    fontSize: 10,
    opacity: 0.7,
  },
  timeValue: {
    fontSize: 11,
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
