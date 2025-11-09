import React, { useState } from "react";
import '../styles/TrainData.css'
import { Station, layoutNameMap } from '../constants/stationmap';
import { TrainData, TrainType, TimeEntry, Diagrams } from "../constants/Traindatamap";

interface TrainDataProps {
  TrainDataA: TrainData[];
  typesA: TrainType[];
  stationsA: Station[];
  diagrams: Diagrams[];
}
interface TrainRowProps {
  TrainDataA: TrainData[];
  station: Station;
  rowIdx: number;
}
interface TrainRowPartsProps {
  TrainDataA: TrainData[];
  station: Station;
  rowIdx: number;
  show: keyof TimeEntry;
}
/*const DiaSelect: React.FC <{value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
<select name="name" id="name" value={value} onChange={e => onChange(e.target.value)}>
      <option value="1">ダイヤ１</option>
      <option value="2">ダイヤ２</option>
    </select>*/
const DiaSelect: React.FC<{ value: string; onChange: (v: string) => void; diagrams: Diagrams[] }> = ({ value, onChange, diagrams }) => {
  console.log(diagrams);
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

//「1行」のコンポーネント
const TrainRowParts: React.FC<TrainRowPartsProps> = ({ TrainDataA, station, rowIdx, show }) => {
  //console.log(station.id);
  //3点リーダはtimeのpropsすべて渡すという意味
  const getTimeCell = (traindata: TrainData): TimeEntry[] => {
    //console.log(traindata.type);
    return traindata.time.map((time) => {
      if (time.stop === "2") {
        return { ...time, stop: "レ", arrive: time.arrive || "レ", departure: time.departure || "レ", railNumber: "||" };
      } else if (time.stop === "1") {
        return { ...time, stop: time.departure || "", railNumber: getRailNumber(time.railNumberID) };
      } else if (time.stop == "0") {
        return { ...time, stop: "・・・", railNumber: getRailNumber(time.railNumberID) };
      }
      return time;
    });
  };
  //時刻表の左部に駅名を表示するかどうか
  const getNameOrRailNumber = (): string => {
    if (show == "railNumber") {
      return "発着番線";
    } else {
      return station.name;
    }
  }
  //Onedata_cellとは時刻表表示時の1セルのこと
  const getRailNumber = (id: number): string => {
    const RailNumber = station.railnumber[id];
    return RailNumber ? RailNumber.ryakushou : "";
  }
  return (
    <tr key={station.id}>
      <td className="tt-station">
        <div className="Station-cell">{getNameOrRailNumber()}</div>
      </td>
      {TrainDataA.map((Onedata_cell) => (
        <td
          className="CTimes"
          key={`${Onedata_cell.DiaLine}-${Onedata_cell.id}`}
          data-show={Onedata_cell.time[rowIdx]?.[show]}
        >
          <div className="tt-time" data-show={Onedata_cell.time[rowIdx]?.[show]}>
            <div className="Time-cell">{getTimeCell(Onedata_cell)[rowIdx]?.[show]}</div>
          </div>
        </td>
      ))}
    </tr>
  )

}
//着発表示するかどうか
const TrainRow: React.FC<TrainRowProps> = ({ TrainDataA, station, rowIdx }) => {
  //判断用の関数を入れたい
  //console.log(station.layout);
  //console.log(layoutNameMap);
  //console.log(layoutNameMap[station.layout].values[0]);
  //着発番線が入る場合
  if (layoutNameMap[station.layout].values[0] == 1 && layoutNameMap[station.layout].values[1] == 1) {

    return (
      <>
        <TrainRowParts
          key={`${station.id}-1`}
          TrainDataA={TrainDataA}
          station={station}
          rowIdx={rowIdx}
          show="arrive"
        />
        <TrainRowParts
          key={`${station.id}-2`}
          TrainDataA={TrainDataA}
          station={station}
          rowIdx={rowIdx}
          show="railNumber"
        />
        <TrainRowParts
          key={`${station.id}-3`}
          TrainDataA={TrainDataA}
          station={station}
          rowIdx={rowIdx}
          show="departure"
        />
      </>
    );
    //到着時刻のみの場合
  } else if (layoutNameMap[station.layout].values[0] == 1) {
    return (
      <TrainRowParts
        key={station.id}
        TrainDataA={TrainDataA}
        station={station}
        rowIdx={rowIdx}
        show="arrive"
      />
    );
    //発車時刻のみの場合
  } else if (layoutNameMap[station.layout].values[1] == 1)
    return (
      <TrainRowParts
        key={station.id}
        TrainDataA={TrainDataA}
        station={station}
        rowIdx={rowIdx}
        show="departure"
      />
    );
}


//時刻表示メインコンポーネント
const TrainDataTable: React.FC<TrainDataProps> = ({ TrainDataA, typesA, stationsA, diagrams }) => {
  const [selectedDia, setSelectedDia] = useState("1");
  const getTypeById = (id: number): string => {
    const TypeName = typesA[id]
    return TypeName ? TypeName.ryakushou : "TypeName Not Found";
  };
  console.log(diagrams);
  //ここで、ダイヤ選択している
  const filteredTrainDataA = TrainDataA.filter((onedata) => String(onedata.DiaLine) === selectedDia);
  console.log(filteredTrainDataA);
  return (
    <div>
      <DiaSelect value={selectedDia} onChange={setSelectedDia} diagrams={diagrams} />
      <table className="tt-table">
        <thead>
          <tr>
            <th className="tt-station-header"></th>
            {filteredTrainDataA.map((onedata) => (
              <th className="TrainData" key={`${onedata.DiaLine}-${onedata.id}`}>
                <div>{onedata.number}</div>
                <div>{getTypeById(onedata.type)}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stationsA.flatMap((station, rowIdx) => (
            <TrainRow
              key={station.id}
              TrainDataA={filteredTrainDataA}
              station={station}
              rowIdx={rowIdx}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};
export default TrainDataTable;