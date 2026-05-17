import React, { useState } from 'react';
import { Station } from "../constants/stationmap";
import { parseOud, parseTrainTypes } from '../../../shared/parsers/oudParser'; // パース関数をフロントで呼ぶ
interface Props {
  stationsA: Station[];
}
const DataExport: React.FC<Props> = ({ stationsA }) => {
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");

  // JSONエクスポート用関数
  const exportStationsAsJson = () => {
    const json = JSON.stringify(stationsA, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stations.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // 列車種別をOUDファイルからインポート
  const handleImportTrainTypes = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setMessage("");

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;

        // 1. OUDファイルを解析
        const oudData = parseOud(content, file.name);
        
        // 2. TrainType配列を取得して整形
        const trainTypes = parseTrainTypes(oudData.TrainType);
        
        const response = await fetch('http://localhost:3000/api/train-types/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ trainTypes }), // 生テキストではなく、綺麗なオブジェクトを送る
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || `Server error: ${response.status}`);
        }

        const result = await response.json();
        setMessage(`✅ ${result.message}`);
        console.log('Train types imported successfully:', result.trainTypes);
      } catch (err: any) {
        setMessage(`❌ インポート失敗: ${err.message}`);
        console.error('Error importing train types:', err);
      } finally {
        setImporting(false);
        // ファイル入力をリセット
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsText(file, "shift-jis");
  };

  return (
    <>
      <button onClick={exportStationsAsJson}>開いたoud2ファイルの駅情報をJSON出力</button>
      <label htmlFor="train-types-input" style={{ marginLeft: '10px' }}>
        <button
          //component="span" 
          disabled={importing}
          onClick={() => document.getElementById('train-types-input')?.click()}
        >
          {importing ? 'インポート中...' : '列車種別をインポート'}
        </button>
      </label>
      <input
        id="train-types-input"
        type="file"
        accept=".oud,.oud2"
        onChange={handleImportTrainTypes}
        style={{ display: 'none' }}
      />
      {message && <div style={{ marginTop: '10px', color: message.includes('✅') ? 'green' : 'red' }}>{message}</div>}
      {/* ...既存のテーブル... */}
    </>
  );
};
export default DataExport;