// frontend/src/components/TimeTableByDB.tsx
import { useEffect, useState } from 'react';
import { formatTime as sharedFormatTime } from '../utils/Time';

interface TrainStopTime {
  stationId: number;
  arrivalMinute: number | null;
  departureMinute: number | null;
  trackName?: string;
  isPass: boolean;
}

interface TrainData {
  id: number;
  trainNumber: string;
  trainName?: string;
  direction: string;
  trainTypeCode: number;
  trainType?: {
    code: number;
    name: string;
  };
  stopTimes?: TrainStopTime[];
}
interface Station {
  id: number;
  name: string;
}

export const TimeTableByDB = () => {
  const [trainData, setTrainData] = useState<TrainData[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 絞り込み用の状態 (デフォルトは下り 'Kudari')
  const [directionFilter, setDirectionFilter] = useState<'Kudari' | 'Nobori'>('Kudari');
  // 表示件数制限（データ量が多いため、一旦5件に制限）
  const [displayLimit, setDisplayLimit] = useState<number>(5);

  useEffect(() => {
    // 駅情報とを列車データの両方を取得
    const fetchData = async () => {
      try {
        // 駅情報を取得
        const stationRes = await fetch('http://localhost:3000/api/stations');
        if (!stationRes.ok) {
          throw new Error(`Station API error! status: ${stationRes.status}`);
        }
        const stationResponse = await stationRes.json();
        const stationList = Array.isArray(stationResponse.data) ? stationResponse.data : stationResponse;
        setStations(stationList);

        // 列車データを取得
        const trainRes = await fetch('http://localhost:3000/api/trains');
        if (!trainRes.ok) {
          throw new Error(`Train API error! status: ${trainRes.status}`);
        }
        const trainResponse = await trainRes.json();
        const trains = Array.isArray(trainResponse.data) ? trainResponse.data : trainResponse;
        setTrainData(trains);
        setError(null);
      } catch (err) {
        console.error("データ取得失敗:", err);
        setError("駅データまたは列車データの取得に失敗しました。バックエンドが起動しているか確認してください。");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 時刻を分数から "HHMM" 形式の文字列に変換（1桁の時間は先頭にスペース）
  const minuteToTimeString = (minute: number | null | undefined): string => {
    if (minute === null || minute === undefined) {
      return '';
    }
    const hours = Math.floor(minute / 60);
    const mins = minute % 60;
    const paddedHours = hours < 10 ? ' ' + hours.toString() : hours.toString().padStart(2, '0');
    const paddedMins = mins.toString().padStart(2, '0');
    return `${paddedHours}${paddedMins}`;
  };

  // 時刻を分数から TrainData.tsx と同じ形式に変換
  const formatTime = (minute: number | null | undefined): string => {
    if (minute === null || minute === undefined) {
      return '-';
    }
    const timeStr = minuteToTimeString(minute);
    return sharedFormatTime(timeStr);
  };

  // stationId から駅名を取得
  const getStationName = (stationId: number): string => {
    const station = stations.find((s) => s.id === stationId);
    return station ? station.name : `駅 ${stationId}`;
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>読み込み中...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;
  }

  if (trainData.length === 0) {
    return <div style={{ padding: '20px' }}>登録された列車データがありません</div>;
  }

   // 選択された方向（上下線）に応じて、表示する列車をフィルタリングして制限
  const filteredTrains = trainData.filter((train) => train.direction === directionFilter);

  // 表示件数の制限（一部だけ表示）
  const partOfTrains = filteredTrains.slice(0, displayLimit);
  // TrainData.tsx と同様のロジック★
  // 上り（Nobori）の場合は駅一覧を逆順にし、下りの場合はそのままの順序にする
  const orderedStations = directionFilter === 'Nobori' ? [...stations].reverse() : stations;
  console.log(partOfTrains)
  //この行より下だけを修正してほしい。
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>時刻表（データベース）</h2>

      {/* コントロール UI 領域 */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'center' }}>
        {/* 上下線切り替え（ラジオボタン） */}
        <div>
          <label style={{ marginRight: '15px', cursor: 'pointer' }}>
            <input
              type="radio"
              name="direction"
              value="Kudari"
              checked={directionFilter === 'Kudari'}
              onChange={() => setDirectionFilter('Kudari')}
            />
            下り列車
          </label>
          <label style={{ cursor: 'pointer' }}>
            <input
              type="radio"
              name="direction"
              value="Nobori"
              checked={directionFilter === 'Nobori'}
              onChange={() => setDirectionFilter('Nobori')}
            />
            上り列車
          </label>
        </div>

        {/* 表示件数の制御 */}
        <div>
          <label htmlFor="limit-select" style={{ marginRight: '5px' }}>表示列車数:</label>
          <select
            id="limit-select"
            value={displayLimit}
            onChange={(e) => setDisplayLimit(Number(e.target.value))}
          >
            <option value={3}>3編成</option>
            <option value={5}>5編成</option>
            <option value={10}>10編成</option>
            <option value={50}>50編成</option>
          </select>
          <span style={{ marginLeft: '10px', color: '#666', fontSize: '12px' }}>
            (該当全 {filteredTrains.length} 件中)
          </span>
        </div>
      </div>

      {/* 縦型時刻表テーブル */}
      {partOfTrains.length === 0 ? (
        <div style={{ color: '#666' }}>該当する列車がありません。</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: '13px', textAlign: 'center' }}>
            <thead>
              <tr style={{ backgroundColor: '#f4f4f4' }}>
                <th style={{ border: '1px solid #ddd', padding: '10px', minWidth: '100px' }}>駅名 / 列車</th>
                {partOfTrains.map((train) => (
                  <th key={train.id} style={{ border: '1px solid #ddd', padding: '10px', minWidth: '90px' }}>
                    <div style={{ fontWeight: 'bold', color: '#005bac' }}>{train.trainNumber}</div>
                    <div style={{ fontSize: '11px', color: '#555' }}>{train.trainType?.name || '種別名なし'}</div>
                    <div style={{ fontSize: '11px', color: '#555' }}>{train.trainName || ''}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* 正しい向きに並んだ駅一覧（orderedStations）を基準に1行ずつループ */}
              {orderedStations.map((station, stationIndex) => (
                <tr key={station.id}>
                  {/* 駅名を表示 */}
                  <td style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#fafafa', fontWeight: 'bold', textAlign: 'left' }}>
                    {station.name}
                  </td>
                  
                  {/* 各列車を横に並べるループ */}
                  {partOfTrains.map((train) => {
                    // インデックスではなく、現在の行の駅ID（station.id）に一致する停車時間を取得
                    const stop = train.stopTimes?.find((s) => s.stationId === station.id);
                    
                    // 前の駅の発車時刻を取得（始発判定用）
                    const prevStation = stationIndex > 0 ? orderedStations[stationIndex - 1] : null;
                    const prevStop = prevStation ? train.stopTimes?.find((s) => s.stationId === prevStation.id) : null;
                    
                    // この列車が現在の駅のデータを持っていない場合
                    if (!stop) {
                      return <td key={train.id} style={{ border: '1px solid #ddd', padding: '8px', color: '#ccc' }}>-</td>;
                    }
                    
                    // レ点（通過駅）の場合
                    if (stop.isPass) {
                      return (
                        <td key={train.id} style={{ border: '1px solid #ddd', padding: '8px' }}>
                          <span style={{ color: '#aaa', fontSize: '11px' }}>レ</span>
                        </td>
                      );
                    }
                    
                    // 到着時刻の処理（始発駅の「〇」判定を含む）
                    let arrivalDisplay = '';
                    if (stop.arrivalMinute !== null) {
                      // 現在の路線/進行方向における手前の駅の発車時刻が空白なら「始発駅」
                      const prevDeparture = prevStop?.departureMinute;
                      const isPrevEmpty = prevDeparture === null || prevDeparture === undefined;
                      
                      if (isPrevEmpty && stop.departureMinute !== null) {
                        arrivalDisplay = '〇';
                      } else {
                        arrivalDisplay = formatTime(stop.arrivalMinute);
                      }
                    } else {
                      arrivalDisplay = '・・・';
                    }
                    
                    // 发車時刻の処理
                    const departureDisplay = stop.departureMinute !== null 
                      ? formatTime(stop.departureMinute)
                      : '・・・';
                    
                    return (
                      <td key={train.id} style={{ border: '1px solid #ddd', padding: '8px' }}>
                        <div>
                          {stop.arrivalMinute !== null && (
                            <div style={{ fontSize: '11px', color: '#666' }}>着 {arrivalDisplay}</div>
                          )}
                          {stop.departureMinute !== null && (
                            <div style={{ fontWeight: 'bold' }}>発 {departureDisplay}</div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};