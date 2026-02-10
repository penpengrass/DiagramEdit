import React, { useState } from "react";
import { formatTime } from '../utils/Time';
import { Station, layoutNameMap } from '../constants/stationmap';
import { TrainData, TrainType, Diagrams, TimeEntry } from "../constants/Traindatamap";
import { Time } from '../utils/Time'; // 👈 Timeクラスをインポート
interface Props {
  TrainDataA: TrainData[];
  typesA: TrainType[];
  stationsA: Station[];
  diagrams: Diagrams[];
}
const DiaSelect: React.FC<{ value: string; onChange: (v: string) => void; diagrams: Diagrams[] }> = ({ value, onChange, diagrams }) => {
  //console.log(diagrams);
  const options = diagrams && diagrams.length > 0
    ? diagrams.map(d => (
      <option key={d.id} value={String(d.id + 1)}>{d.name}</option>
    ))
    : [
      <option key="1" value="1">初期ダイヤ</option>,
      <option key="2" value="2">第2ダイヤ</option>
    ];
  return (
    <select name="name" id="name" value={value} onChange={e => onChange(e.target.value)}>
      {options}
    </select>
  );
};
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
const StationTable: React.FC<Props> = ({ TrainDataA, typesA, stationsA, diagrams }) => {
  const [selectedStation, setSelectedStation] = useState("1");
  const [selectedDia, setSelectedDia] = useState("1");
  const [isDownDirection, setIsDownDirection] = useState(true); // true=下り, false=上り
  const filteredTrainDataA = TrainDataA.filter((onedata) => String(onedata.DiaLine) === selectedDia);
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

  const stationIdx = (() => {
    const idx = Number(selectedStation) - 1;
    if (!stationsA || stationsA.length === 0) return idx;
    return isDownDirection ? idx : (stationsA.length - 1 - idx);
  })();

  // 指定時間帯の列車時刻を収集
  const timesForHour = (hour: number) => {
    const list: Array<{ typeName: string; minutes: number; trainNumber: string }> = [];
    // 方向で絞り込み（dir が 0/1 の想定）
    const dirVal = isDownDirection ? 0 : 1;
    const trains = filteredTrainDataA.filter(t => (t.dir ?? 0) === dirVal);
    trains.forEach(train => {
      const t = train.time && train.time[stationIdx];
      if (!t) return;
      // 優先して到着・発車両方を確認
      const cand = [] as Array<{ raw: Time | string; label: string }>;
      //if (isReal(t.arrive)) cand.push({ raw: t.arrive, label: train.number });
      if (isReal(t.departure)) cand.push({ raw: t.departure, label: train.number });
      cand.forEach(c => {
        const h = getHour(c.raw.toString());
        if (h === hour) {
          // 分のみを抽出して object にして格納（minutes は number 型）
          const rawStr = c.raw.toString();
          const m = rawStr.match(/(\d{1,2}):?(\d{2})/);
          let minutes: number = 0;
          if (m) minutes = Number(m[2]);
          else if (rawStr.length >= 2) minutes = Number(rawStr.slice(-2));
          const typeName = typesA[train.type]?.name || typesA[train.type]?.ryakushou || "";
          const trainNumber = String(train.number);
          // 別変数にしてオブジェクトとして格納
          const obj = { typeName, minutes, trainNumber };
          list.push(obj);
          //console.log(list);
        }
      });
    });
    return list.sort((a, b) => a.minutes - b.minutes);
  };
  /*
 <div style={{ display: 'inline-block', marginLeft: 8 }}>
        <label style={{ marginRight: 8 }}>
          <input type="radio" name="direction" checked={isDownDirection} onChange={() => setIsDownDirection(true)} /> 下り
        </label>
        <label>
          <input type="radio" name="direction" checked={!isDownDirection} onChange={() => setIsDownDirection(false)} /> 上り
        </label>
      </div>*/
  return (
    <div>
      <DiaSelect value={selectedDia} onChange={setSelectedDia} diagrams={diagrams} />
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
              <td className="timetable-row">
                {timesForHour(h).length > 0 ? (
                  timesForHour(h).map((v, idx) => (
                    <div className="sst" key={`hour-${h}-item-${idx}`}>
                      <span>{v.minutes}</span>
                      <span>{v.typeName}</span>
                      <span>{v.trainNumber}</span>
                    </div>
                  ))
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