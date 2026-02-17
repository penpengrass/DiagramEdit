import React from 'react';
import { Station } from "../constants/stationmap";
interface Props{
    stationsA:Station[];
}
const DataExport: React.FC<Props> = ({ stationsA }) => {

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

  // ...existing code...
  return (
    <>
      <button onClick={exportStationsAsJson}>駅情報をJSONでエクスポート</button>
      {/* ...既存のテーブル... */}
    </>
  );
};
export default DataExport;