import React, { useState } from "react";
import { Station} from '../constants/stationmap';
import type { TrainData, TrainType, Diagrams } from '../../../shared/types/timetable';
import '../styles/StationShow.css'
import { getStationTimetable, getStationTimetableHours } from '../../../shared/utils/stationTimetable';
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
  const timetable = getStationTimetable({
    kudariTrainData: KudariTrainDataA,
    noboriTrainData: NoboriTrainDataA,
    types: typesA,
    stations: stationsA,
    selectedStation,
    selectedDia,
    direction: isDownDirection ? 'down' : 'up',
  });
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
          {getStationTimetableHours().map(h => (
            <tr key={`hour-${h}`}>
              <td className="stt-side-row">{h}</td>
              <td className="timetable-row">
                {timetable.filter((v) => v.hour === h).length > 0 ? (
                  timetable.filter((v) => v.hour === h).map((v, idx) => {
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