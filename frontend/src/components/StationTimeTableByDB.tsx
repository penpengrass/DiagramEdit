import React, { useEffect, useState } from 'react';
import { formatTime as sharedFormatTime } from '../utils/Time';
import '../styles/StationShow.css';

// --- 型定義 ---
interface Station {
  id: number;
  name: string;
}

interface OuterTerminalStation {
  id: number;
  name: string;
}

interface OuterTimeData {
  id: number;
  trainId: number;
  pointStationId: number;
  terminalStationId: number | null;
  terminalStationName?: string;
  outerTerminalStation?: {
    name: string;
  };
  directionType: 'ARR' | 'DEP';
  pointTime: number | string;
  terminalTime: number | string;
}

interface TrainStopTime {
  stationId: number;
  arrivalMinute: number | null;
  departureMinute: number | null;
  trackName?: string;
  isPass: boolean;
}

interface TrainType {
  code: number;
  name: string;
  color?: string; // 例: "#ff0000" または "ff0000"
}

interface TrainData {
  id: number;
  trainNumber: string;
  trainName?: string;
  direction: 'Kudari' | 'Nobori';
  trainTypeCode: number;
  trainType?: TrainType;
  stopTimes?: TrainStopTime[];
  outerArrive?: OuterTimeData[];
  outerDep?: OuterTimeData[];
  outerTimes?: OuterTimeData[];
}

// 時刻表記変換用ヘルパー（分数 → "HHMM"）
const minuteToTimeString = (minute: number | null | undefined): string => {
  if (minute === null || minute === undefined) return '';
  const hours = Math.floor(minute / 60);
  const mins = minute % 60;
  const paddedHours = hours < 10 ? ' ' + hours.toString() : hours.toString().padStart(2, '0');
  const paddedMins = mins.toString().padStart(2, '0');
  return `${paddedHours}${paddedMins}`;
};

// 時刻フォーマット表示関数（"08:15" 等へ変換）
const formatDisplayTime = (val: number | string | null | undefined): string => {
  if (val === null || val === undefined || val === '') return '';
  if (typeof val === 'string' && val.includes(':')) return val;
  const num = Number(val);
  if (isNaN(num)) return String(val);
  return sharedFormatTime(minuteToTimeString(num));
};

// DBの色は ABGR 形式で保存されていることがあるため、CSS 用には RGB へ変換する
const formatColor = (colorStr?: string): string => {
  if (!colorStr) return 'transparent';

  const value = colorStr.trim();
  if (!value) return 'transparent';

  const clean = value.replace('#', '').trim();

  if (/^[0-9A-Fa-f]{3}$/.test(clean)) {
    const expanded = clean.split('').map((ch) => ch + ch).join('').toUpperCase();
    return `#${expanded}`;
  }

  if (/^[0-9A-Fa-f]{6}$/.test(clean)) {
    return `#${clean.toUpperCase()}`;
  }

  if (/^[0-9A-Fa-f]{8}$/.test(clean)) {
    // ABGR -> RGB に変換
    // 例: #000000FF -> #FF0000
    const alpha = clean.slice(0, 2);
    const blue = clean.slice(2, 4);
    const green = clean.slice(4, 6);
    const red = clean.slice(6, 8);
    if (alpha === '00' || alpha === 'FF') {
      return `#${red}${green}${blue}`.toUpperCase();
    }
    return `#${red}${green}${blue}`.toUpperCase();
  }

  return value;
};

export const StationTimeTableByDB: React.FC = () => {
  // DB取得データ State
  const [stations, setStations] = useState<Station[]>([]);
  const [trains, setTrains] = useState<TrainData[]>([]);
  const [outerTerminals, setOuterTerminals] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // UI選択 State
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [direction, setDirection] = useState<'Kudari' | 'Nobori'>('Kudari');
  const [isPocketShow, setIsPocketShow] = useState<boolean>(true); // true: 縦表示, false: 横表示

  // 1. 初回データ取得 (駅・路線外駅マスタ・列車一覧)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // 駅一覧取得
        const stationRes = await fetch('http://localhost:3000/api/stations');
        if (!stationRes.ok) throw new Error('駅データの取得に失敗しました');
        const stationJson = await stationRes.json();
        const stationList: Station[] = Array.isArray(stationJson.data) ? stationJson.data : stationJson;
        setStations(stationList);
        if (stationList.length > 0) {
          setSelectedStationId(stationList[0].id ?? null);
        } else {
          setSelectedStationId(null);
        }

        // 路線外駅マスタ取得
        const outerRes = await fetch('http://localhost:3000/api/outer-terminals');
        if (outerRes.ok) {
          const outerJson = await outerRes.json();
          const outerList: OuterTerminalStation[] = Array.isArray(outerJson.data) ? outerJson.data : outerJson;
          const map: Record<number, string> = {};
          outerList.forEach(item => {
            map[item.id] = item.name;
          });
          setOuterTerminals(map);
        }

        // 列車データ取得
        const trainRes = await fetch('http://localhost:3000/api/trains');
        if (!trainRes.ok) throw new Error('列車データの取得に失敗しました');
        const trainJson = await trainRes.json();
        const rawTrains = Array.isArray(trainJson.data) ? trainJson.data : trainJson;

        // outerTimes の構造正規化
        const normalizedTrains: TrainData[] = rawTrains.map((t: any) => ({
          ...t,
          outerArrive: Array.isArray(t.outerArrive)
            ? t.outerArrive
            : t.outerTimes?.filter((o: any) => o.directionType === 'ARR'),
          outerDep: Array.isArray(t.outerDep)
            ? t.outerDep
            : t.outerTimes?.filter((o: any) => o.directionType === 'DEP'),
        }));

        setTrains(normalizedTrains);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'データ取得エラー');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div style={{ padding: '20px' }}>駅時刻表（DB）を読み込み中...</div>;
  if (error) return <div style={{ padding: '20px', color: 'red' }}>エラー: {error}</div>;
  if (selectedStationId === null || selectedStationId === undefined) {
    return <div style={{ padding: '20px' }}>駅データが存在しません。</div>;
  }

  // 2. 終着駅名の判別ロジック
  const getTerminalStationName = (train: TrainData): string => {
    // A. 路線外終着(ARR)がある場合はそれを最優先
    const outerArr = train.outerArrive && train.outerArrive.length > 0 ? train.outerArrive[0] : null;
    if (outerArr) {
      if (outerArr.terminalStationName) return outerArr.terminalStationName;
      if (outerArr.outerTerminalStation?.name) return outerArr.outerTerminalStation.name;
      if (outerArr.terminalStationId && outerTerminals[outerArr.terminalStationId]) {
        return outerTerminals[outerArr.terminalStationId];
      }
    }

    // B. 自線内の停車駅から最終停車駅を探す
    if (train.stopTimes && train.stopTimes.length > 0) {
      // 下りなら駅リストの末尾側、上りなら先頭側（逆順）が路線上の終点方向
      const checkStations = direction === 'Nobori' ? [...stations].reverse() : stations;
      
      for (let i = checkStations.length - 1; i >= 0; i--) {
        const st = checkStations[i];
        const stop = train.stopTimes.find(s => s.stationId === st.id);
        if (stop && !stop.isPass && (stop.arrivalMinute !== null || stop.departureMinute !== null)) {
          return st.name;
        }
      }
    }

    return '';
  };

  // 3. 時間帯（4時〜27時/翌3時）の順序
  const hourOrder = Array.from({ length: 24 }, (_, i) => (i + 4) % 24);

  // 4. 指定した時間帯（時）における対象駅の列車時刻リストを取得
  const getTimesForHour = (hour: number) => {
    const result: Array<{
      minute: number;
      typeName: string;
      trainNumber: string;
      terminal: string;
      color: string;
    }> = [];

    // 現在の方向でフィルタリング
    const filteredTrains = trains.filter(t => t.direction === direction);

    filteredTrains.forEach(train => {
      const stop = train.stopTimes?.find(s => s.stationId === selectedStationId);
      if (!stop || stop.isPass) return; // 通過・未停車は除外

      // 発車時刻優先。終着駅等で発車時刻が無い場合は到着時刻を使用
      const targetMinute = stop.departureMinute ?? stop.arrivalMinute;
      if (targetMinute === null || targetMinute === undefined) return;

      const trainHour = Math.floor(targetMinute / 60) % 24;
      if (trainHour === hour) {
        const minute = targetMinute % 60;
        const typeName = train.trainType?.name || '普通';
        const color = formatColor(train.trainType?.color);
        const terminal = getTerminalStationName(train);

        result.push({
          minute,
          typeName,
          trainNumber: train.trainNumber,
          terminal,
          color,
        });
      }
    });

    // 分の昇順にソート
    return result.sort((a, b) => a.minute - b.minute);
  };

  const selectedStationObj = stations.find(s => s.id === selectedStationId);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>駅時刻表（データベース連携）</h2>

      {/* コントロールパネル */}
      <div style={{ marginBottom: '15px', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* 駅選択Dropdown */}
        <div>
          <label htmlFor="station-select" style={{ fontWeight: 'bold', marginRight: '8px' }}>駅選択:</label>
          <select
            id="station-select"
            value={selectedStationId}
            onChange={(e) => setSelectedStationId(Number(e.target.value))}
            style={{ padding: '4px 8px', fontSize: '14px' }}
          >
            {stations.map(st => (
              <option key={st.id} value={st.id}>{st.name}</option>
            ))}
          </select>
        </div>

        {/* 上下線選択ラジオボタン */}
        <div style={{ borderLeft: '1px solid #ccc', paddingLeft: '15px' }}>
          <label style={{ marginRight: '15px', cursor: 'pointer' }}>
            <input
              type="radio"
              name="st-direction"
              checked={direction === 'Kudari'}
              onChange={() => setDirection('Kudari')}
            /> 下り方面
          </label>
          <label style={{ cursor: 'pointer' }}>
            <input
              type="radio"
              name="st-direction"
              checked={direction === 'Nobori'}
              onChange={() => setDirection('Nobori')}
            /> 上り方面
          </label>
        </div>

        {/* 縦横表示切り替え */}
        <div style={{ borderLeft: '1px solid #ccc', paddingLeft: '15px' }}>
          <label style={{ marginRight: '15px', cursor: 'pointer' }}>
            <input
              type="radio"
              name="st-layout"
              checked={isPocketShow}
              onChange={() => setIsPocketShow(true)}
            /> 縦表示
          </label>
          <label style={{ cursor: 'pointer' }}>
            <input
              type="radio"
              name="st-layout"
              checked={!isPocketShow}
              onChange={() => setIsPocketShow(false)}
            /> 横表示
          </label>
        </div>
      </div>

      {/* 時刻表テーブル */}
      <div style={{ marginTop: '10px' }}>
        <table className="tt-table">
          <thead>
            <tr>
              <th className="stt-side-header">時</th>
              <th className="stt-main-header">
                {selectedStationObj?.name}駅 時刻表 ({direction === 'Kudari' ? '下り' : '上り'})
              </th>
            </tr>
          </thead>
          <tbody>
            {hourOrder.map(h => {
              const hourList = getTimesForHour(h);
              return (
                <tr key={`hour-${h}`}>
                  <td className="stt-side-row">{h}</td>
                  <td className="timetable-row">
                    {hourList.length > 0 ? (
                      hourList.map((v, idx) => {
                        // 当駅止めは非表示・または区別する場合はここを調整
                        const minuteStr = v.minute.toString().padStart(2, '0');

                        return (
                          <div
                            className="sst"
                            key={`h-${h}-${idx}`}
                            style={{
                              color: v.color,
                              display: isPocketShow ? 'flex' : 'inline-block',
                              flexDirection: isPocketShow ? 'column' : 'row',
                              alignItems: 'center',
                              marginRight: isPocketShow ? '12px' : '16px',
                              marginBottom: '4px',
                            }}
                          >
                            <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{minuteStr}</span>
                            <span style={{ fontSize: '11px', margin: isPocketShow ? '0' : '0 4px' }}>{v.typeName}</span>
                            <span style={{ fontSize: '11px' }}>{v.terminal}</span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="empty">&nbsp;</div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StationTimeTableByDB;