import React, { useState } from "react";
import { formatTime } from '../utils/Time';
import { Station, layoutNameMap } from '../constants/stationmap';
import { TrainData, TrainType, TimeEntry } from "../constants/Traindatamap";
import { Time } from '../utils/Time'; // 👈 Timeクラスをインポート
interface Props {
  TrainDataA: TrainData[];
  typesA: TrainType[];
  stationsA: Station[];
}
const StationSelect: React.FC<{ value: string; onChange: (v: string) => void; stationsA: Station[] }> = ({ value, onChange, stationsA }) => {
  //console.log(diagrams);
  const options = stationsA && stationsA.length > 0
    ? stationsA.map(d => (
      <option key={d.id} value={String(d.id + 1)}>{d.name}</option>
    ))
    : [
      <option key="1" value="1">駅1</option>,
      <option key="2" value="2">駅2</option>
    ];
  return (
    <select name="name" id="name" value={value} onChange={e => onChange(e.target.value)}>
      {options}
    </select>
  );
};
//駅時刻表示メインコンポーネント
const StationTable: React.FC<Props> = ({ TrainDataA, typesA, stationsA }) => {
  const [selectedStation, setSelectedStation] = useState("1");

  // 時刻文字列が実データか判定
  const isReal = (v?: string | Time) => v != null && v !== "" && !(typeof v === 'string' && (v.trim() === '' || v === '・・・' || v === 'レ' || v === '||'));

  // 指定駅インデックスの時刻エントリから時間（0-23）を抽出
  const getHour = (s?: string): number | null => {
    if (!s) return null;
    const str = s.trim();
    const m = str.match(/^(\d{1,2})(?::?(\d{2}))$/);
    if (m) return Number(m[1]);
    // 6:00 のような表記
    const m2 = str.match(/^(\d{1,2}):(\d{2})$/);
    if (m2) return Number(m2[1]);
    return null;
    //こちらの方がわかりやすい?
    /*if (!s) return null;
    // コロンがあってもなくても「時」の部分（最初の1〜2桁）を抜き出す
    // const m = s.trim().match(/^(\d{1,2}):?(\d{2})$/);
    // return m ? Number(m[1]) : null;*/
  };

  // 時間順（4..23,0..3）
  const hourOrder = Array.from({ length: 24 }, (_, i) => i).slice(4).concat(Array.from({ length: 4 }, (_, i) => i));

  const stationIdx = Number(selectedStation) - 1;

  // 指定時間帯の列車時刻を収集
  const timesForHour = (hour: number) => {
    const list: string[] = [];
    TrainDataA.forEach(train => {
      const t = train.time && train.time[stationIdx];
      if (!t) return;
      // 優先して到着・発車両方を確認
      const cand = [] as Array<{ raw: Time | string; label: string }>;
      if (isReal(t.arrive)) cand.push({ raw: t.arrive, label: train.number });
      if (isReal(t.departure)) cand.push({ raw: t.departure, label: train.number });
      cand.forEach(c => {
        const h = getHour(c.raw.toString());
        if (h === hour) {
          // 分のみを抽出して表示、種別名も付与する
          const rawStr = c.raw.toString();
          const m = rawStr.match(/(\d{1,2}):?(\d{2})/);
          let minutes = rawStr;
          if (m) minutes = String(Number(m[2]));
          else if (rawStr.length >= 2) minutes = rawStr.slice(-2);
          const typeName = typesA[train.type]?.name || typesA[train.type]?.ryakushou || "";
          const label = typeName ? `${minutes} ${typeName} ${train.number}` : `${minutes} ${train.number}`;
          list.push(label);
        }
      });
    });
    return list.sort();
  };

  return (
    <div>
      <StationSelect value={selectedStation} onChange={setSelectedStation} stationsA={stationsA} />
      <table className="tt-table">
        <thead>
          <tr>
            <th className="stt-side-header">時</th>
            <th className="stt-main-header">時刻表</th>
          </tr>
        </thead>
        <tbody>
          {hourOrder.map(h => (
            <tr key={`hour-${h}`}>
              <td className="stt-side-row">{h}</td>
              <td className="stt-main-row">
                {timesForHour(h).length > 0 ? (
                  timesForHour(h).map((v, idx) => <div className="stt" key={`hour-${h}-item-${idx}`}>{v}</div>)
                ) : (
                  <div className="empty">&nbsp;</div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
export default StationTable;