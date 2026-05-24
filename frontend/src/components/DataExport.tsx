import React, { useState } from 'react';
import { Station } from "../constants/stationmap";
import { parseOud, parseTrainTypes, convertMultipleTrainsForDB } from '../../../shared/parsers/oudParser'; // パース関数をフロントで呼ぶ
interface Props {
  stationsA: Station[];
}
const DataExport: React.FC<Props> = ({ stationsA }) => {
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [importingTrains, setImportingTrains] = useState(false);
  const [messageTrains, setMessageTrains] = useState("");

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

  // 列車データをOUDファイルからインポート
  const handleImportTrains = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportingTrains(true);
    setMessageTrains("");

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;

        // 1. OUDファイルを解析
        const oudData = parseOud(content, file.name);
        console.log(`\n📋 OUDファイル解析完了:`);
        console.log(`  下り列車数: ${oudData.KudariData.length}`);
        console.log(`  上り列車数: ${oudData.NoboriData.length}`);
        
        // 2. 列車データ（下り列車と上り列車）を変換
        const allTrains = [
          ...convertMultipleTrainsForDB(oudData.KudariData),
          ...convertMultipleTrainsForDB(oudData.NoboriData),
        ];
        
        if (allTrains.length === 0) {
          throw new Error('列車データが見つかりませんでした');
        }

        console.log(`🔄 変換後の列車データ: ${allTrains.length} 件`);
        //console.log(`最初の列車の停車駅データ (サンプル):`, JSON.stringify(allTrains[0]?.stopTimes?.slice(0, 3), null, 2));

        const response = await fetch('http://localhost:3000/api/trains/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(allTrains),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || `Server error: ${response.status}`);
        }

        const result = await response.json();
        setMessageTrains(`✅ ${result.message}`);
        console.log('Trains imported successfully:', result);
      } catch (err: any) {
        setMessageTrains(`❌ インポート失敗: ${err.message}`);
        console.error('Error importing trains:', err);
      } finally {
        setImportingTrains(false);
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
      
      <label htmlFor="trains-input" style={{ marginLeft: '10px' }}>
        <button
          disabled={importingTrains}
          onClick={() => document.getElementById('trains-input')?.click()}
        >
          {importingTrains ? 'インポート中...' : '列車データをインポート'}
        </button>
      </label>
      <input
        id="trains-input"
        type="file"
        accept=".oud,.oud2"
        onChange={handleImportTrains}
        style={{ display: 'none' }}
      />
      {messageTrains && <div style={{ marginTop: '10px', color: messageTrains.includes('✅') ? 'green' : 'red' }}>{messageTrains}</div>}
      {/* ...既存のテーブル... */}
    </>
  );
};
export default DataExport;