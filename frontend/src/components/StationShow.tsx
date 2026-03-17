import React from 'react';
import { layoutNameMap, mainNameMap, Station } from '../constants/stationmap';
//import Station from '/DiaUploader.tsx';
//import StationShow,{Station} from "./DiaUploader.tsx";

interface Props {
  stationsA: Station[];
}

const StationList: React.FC<Props> = ({ stationsA }) => {
  console.log(stationsA);
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
  // 駅情報をDBに保存する関数
const saveStationsToDb = async () => {
  try {
    console.log('📤 送信データ:', stationsA); // データを確認
    
    const response = await fetch('http://localhost:3000/api/stations/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stationsA),
    });

    console.log('📊 レスポンスステータス:', response.status); // HTTPステータス確認

    // レスポンスステータスが2xxでない場合
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ APIエラー詳細:', errorData);
      alert(`エラー (${response.status}): ${errorData.error || 'Unknown error'}`);
      return;
    }

    const data = await response.json();
    console.log('✅ レスポンス:', data); // 成功時の詳細
    alert(`✅ ${data.count}件の駅情報を保存しました`);
  } catch (err: any) {
    console.error('❌ キャッチされたエラー:', err);
    console.error('エラーメッセージ:', err.message);
    console.error('エラースタック:', err.stack);
    
    alert('❌ エラー: ' + (err.message || JSON.stringify(err)));
  }
};
  //駅規模を「一般駅」とかにしたい、[main]はEkikibo...
  const getViewByObject = (main: string, map: { [key: string]: { label: string; values: number[] } }
  ): string => {
    //見つからない場合はmain(Ekikibo...)をそのまま返すという意味、Null合体演算子
    return map[main]?.label ?? main;
  };
  const getMainByObject = (main: string, map: { [key: string]: { label: string; value: number } }
  ): string => {
    //見つからない場合はmain(Ekikibo...)をそのまま返すという意味、Null合体演算子
    return map[main]?.label ?? main;
  };
  if (stationsA.length === 0) {
    return <div>No stations loaded.</div>;
  }
  return (
    <>
      <button onClick={exportStationsAsJson}>駅情報をJSONでエクスポート</button>
      <button onClick={saveStationsToDb}>DBに保存</button>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>駅名</th>
            <th>表示形式</th>
            <th>駅規模</th>
            <th>分岐駅</th>
          </tr>
        </thead>
        <tbody>
          {stationsA.map((station) => (
            <tr
              key={station.id}
              data-name={station.name}
              data-main={station.layout}
              data-layout={station.main}
            >
              <td>{station.id}</td>
              <td>{station.name}</td>
              <td>{getViewByObject(station.layout, layoutNameMap)}</td>
              <td>{getMainByObject(station.main, mainNameMap)}</td>
              <td>{station.BrunchFromStationID} {stationsA[station.BrunchFromStationID]?.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};

export default StationList;
