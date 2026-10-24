import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';

import { parseOud } from '@shared/parsers/oudParser';
import type { OudData } from '@shared/types/timetable';

const OUD_FILE_EXTENSIONS = ['.oud', '.oud2'];
const PERSISTED_DIRECTORY_NAME = 'last-opened-oud';
const PERSISTED_FILE_NAME = 'last-opened-file';
const PERSISTED_METADATA_FILE_NAME = 'last-opened-metadata.json';

type PersistedFileMetadata = {
  fileName: string;
};

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

function getPersistedDirectory(): Directory {
  return new Directory(Paths.document, PERSISTED_DIRECTORY_NAME);
}

async function saveLastOpenedFile(uri: string, fileName: string): Promise<void> {
  const directory = getPersistedDirectory();
  directory.create({ intermediates: true, idempotent: true });

  const persistedFile = new File(directory, PERSISTED_FILE_NAME);
  await new File(uri).copy(persistedFile, { overwrite: true });

  const metadataFile = new File(directory, PERSISTED_METADATA_FILE_NAME);
  metadataFile.create({ overwrite: true });
  metadataFile.write(JSON.stringify({ fileName } satisfies PersistedFileMetadata));
}

async function getLastOpenedFile(): Promise<{ file: File; fileName: string } | null> {
  const directory = getPersistedDirectory();
  const metadataFile = new File(directory, PERSISTED_METADATA_FILE_NAME);
  if (!metadataFile.exists) {
    return null;
  }

  const metadata: unknown = JSON.parse(await metadataFile.text());
  if (
    typeof metadata !== 'object'
    || metadata === null
    || !('fileName' in metadata)
    || typeof metadata.fileName !== 'string'
    || !isAllowedOudFile(metadata.fileName)
  ) {
    throw new Error('前回開いたファイルの保存情報が不正です。');
  }

  const file = new File(directory, PERSISTED_FILE_NAME);
  if (!file.exists) {
    throw new Error('前回開いたファイルが端末内に見つかりません。');
  }

  return { file, fileName: metadata.fileName };
}

export function OudDataProvider({ children }: { children: ReactNode }) {
  const [fileName, setFileName] = useState('未選択');
  const [parsedData, setParsedData] = useState<OudData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const restoreLastOpenedFile = async () => {
      setIsLoading(true);
      try {
        const savedFile = await getLastOpenedFile();
        if (!savedFile) {
          return;
        }

        const text = await readOudFileContent(savedFile.file.uri);
        const data = parseOud(text, savedFile.fileName);
        if (isMounted) {
          setFileName(savedFile.fileName);
          setParsedData(data);
          setError(null);
        }
      } catch {
        // Restoring the previous file is optional; keep the app available without it.
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void restoreLastOpenedFile();
    return () => {
      isMounted = false;
    };
  }, []);

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
      const data = parseOud(text, pickedName);
      setParsedData(data);

      try {
        await saveLastOpenedFile(asset.uri, pickedName);
      } catch {
        // Persistence is best-effort; the file remains usable for this session.
      }
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