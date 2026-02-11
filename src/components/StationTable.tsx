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

  // 選択駅のインデックス（time 配列は stationsA の順で格納されている前提で逆順しない）
  const stationIdx = Number(selectedStation) - 1;

  // 指定時間帯の列車時刻を収集
  const timesForHour = (hour: number) => {
    const list: Array<{ typeName: string; minutes: number; trainNumber: string }> = [];
    const dirVal = isDownDirection ? 0 : 1;
    const trains = filteredTrainDataA.filter(t => (t.dir ?? 0) === dirVal);
    trains.forEach(train => {
      const times = train.time || [];
      if (!times || times.length === 0) return;
      if (stationIdx < 0 || stationIdx >= times.length) return;
      const t = times[stationIdx];
      if (!t) return;
      // 発車優先、なければ到着
      const cand: Array<{ raw: Time | string; label: string }> = [];
      if (isReal(t.departure)) cand.push({ raw: t.departure as any, label: train.number });
      else if (isReal(t.arrive)) cand.push({ raw: t.arrive as any, label: train.number });
      cand.forEach(c => {
        const h = getHour(c.raw.toString());
        if (h === hour) {
          const rawStr = c.raw.toString();
          const m = rawStr.match(/(\d{1,2}):?(\d{2})/);
          let minutes: number = 0;
          if (m) minutes = Number(m[2]);
          else if (rawStr.length >= 2) minutes = Number(rawStr.slice(-2));
          const typeName = typesA[train.type]?.name || typesA[train.type]?.ryakushou || "";
          const trainNumber = String(train.number);
          list.push({ typeName, minutes, trainNumber });
        }
      });
    });
    return list.sort((a, b) => a.minutes - b.minutes);
  };
  return (
    <div>
      <DiaSelect value={selectedDia} onChange={setSelectedDia} diagrams={diagrams} />
      <StationSelect value={selectedStation} onChange={setSelectedStation} stationsA={stationsA} />
       <div style={{ display: 'inline-block', marginLeft: 8 }}>
        <label style={{ marginRight: 8 }}>
          <input type="radio" name="direction" checked={isDownDirection} onChange={() => setIsDownDirection(true)} /> 下り
        </label>
        <label>
          <input type="radio" name="direction" checked={!isDownDirection} onChange={() => setIsDownDirection(false)} /> 上り
        </label>
      </div>
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