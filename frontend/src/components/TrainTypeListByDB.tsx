// frontend/src/components/TrainTypeListByDB.tsx
import { useEffect, useState } from 'react';

interface TrainType {
    code: number;
    name: string;
    ryakushou: string;
    color: string;
}

export const TrainTypeList = () => {
  const [trainTypes, setTrainTypes] = useState<TrainType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // バックエンドのAPIを叩く
    fetch('http://localhost:3000/api/train-types')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setTrainTypes(data);
        setError(null);
      })
      .catch((err) => {
        console.error("データ取得失敗:", err);
        setError("種別データの取得に失敗しました。バックエンドが起動しているか確認してください。");
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

  if (trainTypes.length === 0) {
    return <div style={{ padding: '20px' }}>登録された種別がありません</div>;
  }

  return (
    <div>
      <h2>種別一覧（データベース）</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f4f4f4' }}>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>種別コード</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>種別名</th>
          </tr>
        </thead>
        <tbody>
          {trainTypes.map((trainType) => (
            <tr key={trainType.code}>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{trainType.code}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{trainType.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};