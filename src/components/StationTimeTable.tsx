import React, { useState } from "react";
import { formatTime } from '../utils/Time';
import { Station, layoutNameMap } from '../constants/stationmap';
import { TrainData, TrainType, Diagrams, TimeEntry } from "../constants/Traindatamap";
import { Time } from '../utils/Time'; // 👈 Timeクラスをインポート
import { toABGR } from './TypeShow';
interface Props {
  KudariTrainDataA: TrainData[]; // 下りデータ
  NoboriTrainDataA: TrainData[]; // 上りデータ
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
const StationTimeTable: React.FC<Props> = ({ KudariTrainDataA, NoboriTrainDataA, typesA, stationsA, diagrams }) => {
  const [selectedStation, setSelectedStation] = useState("1");
  const [selectedDia, setSelectedDia] = useState("1");
  const [isDownDirection, setIsDownDirection] = useState(true); // true=下り, false=上り
  const [isPocketShow, setIsPocketShow] = useState(true); // true=ポケット表示, false=リスト表示
  // 選択方向に応じて TrainData ソースを切り替える
  // filteredTrainDataA は各処理内で参照される
  // （timesForHour 内ではローカルでフィルタして使う）
  const getFilteredByDia = (source: TrainData[]) => source.filter((onedata) => String(onedata.DiaLine) === selectedDia);
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
  const stationIdx = isDownDirection ? Number(selectedStation) - 1 : stationsA.length - (Number(selectedStation));

  // 列車の終着駅名を取得する（OuterTerminalがあれば優先）
  const getTerminalStation = (train: TrainData): string => {
    // OuterTerminalがあれば優先して表示
    //ここから
    const outerArrive = Array.isArray(train.outerarrive) ? train.outerarrive[0] : train.outerarrive;
    if (outerArrive) {
      const getStationByID = (pointStationID: number, terminalStationID: number): string => {
        if (!stationsA || stationsA.length === 0 || pointStationID == null || terminalStationID == null) return "";
        const st = stationsA[pointStationID]?.OuterTerminal?.[terminalStationID];
        return st ? st.jikoku : "";
      };
      if (outerArrive.terminalStationID) {
        if (isDownDirection) {
          return getStationByID(outerArrive.pointStationID, outerArrive.terminalStationID);
        } else {
          return getStationByID(stationsA.length - outerArrive.pointStationID - 1, outerArrive.terminalStationID);
        }
      } else if (outerArrive.pointStationID != null) {
        return stationsA[outerArrive.pointStationID]?.name || "";
      }
    }
    //ここまで修正対象
    // OuterTerminalがない場合は時刻配列から探す
    const times = train.time || [];
    if (!times || times.length === 0) return "";
    const isRealVal = (v: any) => v != null && v !== "" && !(typeof v === 'string' && (v.trim() === '' || v === '・・・' || v === 'レ' || v === '||'));
    // 終着駅を後ろから探す
    for (let i = times.length - 1; i >= 0; i--) {
      const t = times[i];
      if (!t) continue;
      if (isRealVal(t.arrive) || isRealVal(t.departure)) {
        if (isDownDirection) return stationsA[i]?.name || "";
        else return stationsA[stationsA.length - i - 1]?.name || "";
      }
    }
    return "";
  };

  // 指定時間帯の列車時刻を収集
  const timesForHour = (hour: number) => {
    const list: Array<{ typeName: string; minutes: number; trainNumber: string; terminal: string; trainType: number }> = [];
    const dirVal = isDownDirection ? 0 : 1;
    const source = isDownDirection ? KudariTrainDataA : NoboriTrainDataA;
    const filteredTrainDataA = getFilteredByDia(source);
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
          const terminal = getTerminalStation(train);
          list.push({ typeName, minutes, trainNumber, terminal, trainType: train.type });
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
        <form style={{ marginRight: 32 }}>
          <input type="radio" name="direction" checked={isDownDirection} onChange={() => setIsDownDirection(true)} /> 下り
        </form>
        <form>
          <input type="radio" name="direction" checked={!isDownDirection} onChange={() => setIsDownDirection(false)} /> 上り
        </form>
      </div>
      <div style={{ display: 'inline-block', marginLeft: 8 }}>
        <form style={{ marginRight: 32 }}>
          <input type="radio" name="direction" checked={isPocketShow} onChange={() => setIsPocketShow(true)} /> 時刻表縦表示
        </form>
        <form>
          <input type="radio" name="direction" checked={!isPocketShow} onChange={() => setIsPocketShow(false)} /> 時刻表横表示
        </form>
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
                  timesForHour(h).map((v, idx) => {
                    const selectedStationName = stationsA[Number(selectedStation) - 1]?.name;
                    if (selectedStationName === v.terminal) return null;
                    //<span>{v.trainNumber}</span>
                    if (isPocketShow) {
                      return (
                        <div className="sst" key={`hour-${h}-item-${idx}`} style={{ color: toABGR(typesA[v.trainType]?.color ?? 'transparent'), display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span>{v.minutes}</span>
                          <span>{v.typeName} </span>
                          <span>{v.terminal}</span>
                        </div>
                      );
                    } else {
                      return (
                        <div className="sst" key={`hour-${h}-item-${idx}`} style={{ color: toABGR(typesA[v.trainType]?.color ?? 'transparent')}}>
                          <span>{v.minutes}</span>
                          <span>{v.typeName} </span>
                          <span>{v.terminal}</span>
                        </div>
                      );
                    }
                  })
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
export default StationTimeTable;