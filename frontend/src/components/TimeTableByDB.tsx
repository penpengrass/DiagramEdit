// frontend/src/components/TimeTableByDB.tsx
import { useEffect, useState } from 'react';

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
  stopTimes?: TrainStopTime[];
}

export const TimeTableByDB = () => {
  const [trainData, setTrainData] = useState<TrainData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // バックエンドのAPIを叩く
    fetch('http://localhost:3000/api/trains')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((response) => {
        // レスポンスの data フィールドを取得（バックエンドが { success, data, count } という構造）
        const trains = Array.isArray(response.data) ? response.data : response;
        setTrainData(trains);
        setError(null);
      })
      .catch((err) => {
        console.error("データ取得失敗:", err);
        setError("列車データの取得に失敗しました。バックエンドが起動しているか確認してください。");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // 時刻を分数から HH:MM 形式に変換する
  const formatTime = (minute: number | null | undefined): string => {
    if (minute === null || minute === undefined) {
      return '-';
    }
    const hours = Math.floor(minute / 60);
    const mins = minute % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
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

  return (
    <div>
      <h2>時刻表（データベース）</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f4f4f4' }}>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>列車番号</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>列車名</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>進行方向</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>列車種別コード</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>停車駅数</th>
          </tr>
        </thead>
        <tbody>
          {trainData.map((train) => (
            <tr key={train.id}>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{train.trainNumber}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{train.trainName || '-'}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                {train.direction === 'Kudari' ? '下り' : train.direction === 'Nobori' ? '上り' : train.direction}
              </td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{train.trainTypeCode}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{train.stopTimes?.length || 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}