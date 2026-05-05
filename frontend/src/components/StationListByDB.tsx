// frontend/src/components/StationListByDB.tsx
import { useEffect, useState } from 'react';

interface Station {
  id: number;
  name: string;
}

export const StationList = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // バックエンドのAPIを叩く
    fetch('http://localhost:3000/api/stations')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setStations(data);
        setError(null);
      })
      .catch((err) => {
        console.error("データ取得失敗:", err);
        setError("駅データの取得に失敗しました。バックエンドが起動しているか確認してください。");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div style={{ padding: '20px' }}>読み込み中...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;
  }

  if (stations.length === 0) {
    return <div style={{ padding: '20px' }}>登録された駅がありません</div>;
  }

  return (
    <div>
      <h2>駅一覧（データベース）</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f4f4f4' }}>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>ID</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>駅名</th>
          </tr>
        </thead>
        <tbody>
          {stations.map((station) => (
            <tr key={station.id}>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{station.id}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{station.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};