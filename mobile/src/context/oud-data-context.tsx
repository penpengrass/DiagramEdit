import { createContext, useContext, useState, type ReactNode } from 'react';
import * as DocumentPicker from 'expo-document-picker';

import { parseOud } from '@shared/parsers/oudParser';
import type { OudData } from '@shared/types/timetable';

const OUD_FILE_EXTENSIONS = ['.oud', '.oud2'];

type OudDataContextValue = {
  fileName: string;
  parsedData: OudData | null;
  isLoading: boolean;
  error: string | null;
  openFile: () => Promise<void>;
};

const OudDataContext = createContext<OudDataContextValue | null>(null);

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

  const bytes = new Uint8Array(await response.arrayBuffer());
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
  }

  return utf8Text;
}

export function OudDataProvider({ children }: { children: ReactNode }) {
  const [fileName, setFileName] = useState('未選択');
  const [parsedData, setParsedData] = useState<OudData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openFile = async () => {
    try {
      setError(null);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/plain', '.oud2', 'application/octet-stream', '*/*'],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      const pickedName = asset.name ?? 'oud2ファイル';
      setFileName(pickedName);

      if (!isAllowedOudFile(pickedName)) {
        setError('OUD/OUD2 ファイルのみ選択できます。拡張子が .oud または .oud2 のファイルを選んでください。');
        setParsedData(null);
        return;
      }

      setIsLoading(true);
      const text = await readOudFileContent(asset.uri);
      setParsedData(parseOud(text, pickedName));
    } catch (error) {
      console.error('OUD2 file read failed:', error);
      setError('ファイルを読み込めませんでした。OUD/OUD2 ファイル (.oud, .oud2) を選んでください。');
      setParsedData(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <OudDataContext.Provider value={{ fileName, parsedData, isLoading, error, openFile }}>
      {children}
    </OudDataContext.Provider>
  );
}

export function useOudData(): OudDataContextValue {
  const context = useContext(OudDataContext);
  if (!context) {
    throw new Error('useOudData must be used inside OudDataProvider');
  }
  return context;
}