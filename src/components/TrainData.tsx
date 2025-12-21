import React, { useState } from "react";
import '../styles/TrainData.css'
import { Station, layoutNameMap } from '../constants/stationmap';
import { TrainData, TrainType, TimeEntry, Diagrams } from "../constants/Traindatamap";
import { toABGR } from './TypeShow';
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
  typesA: TrainType[];
}
interface TrainRowPartsProps {
  TrainDataA: TrainData[];
  station: Station;
  rowIdx: number;
  show: keyof TimeEntry;
  typesA: TrainType[];
}
interface OuterTerminal {
  onedata: TrainData;   // 単一オブジェクトを受け取る
  stations: Station[];
  showArr?: boolean;
  showDep?: boolean;
  cellType?: 'th' | 'td';
  bgColor: string;
}
/*const DiaSelect: React.FC <{value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
<select name="name" id="name" value={value} onChange={e => onChange(e.target.value)}>
      <option value="1">ダイヤ１</option>
      <option value="2">ダイヤ２</option>
    </select>*/
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

//「1行」のコンポーネント
const TrainRowParts: React.FC<TrainRowPartsProps> = ({ TrainDataA, station, rowIdx, show, typesA }) => {
  //console.log(station.id);
  //3点リーダはtimeのpropsすべて渡すという意味
  const getTimeCell = (traindata: TrainData): TimeEntry[] => {
    //console.log(traindata.time);
    return traindata.time.map((time) => {
      if (time.stop === "2") {
        return { ...time, stop: "レ", arrive: time.arrive || "レ", departure: time.departure || "レ", railNumber: "||" };
      } else if (time.stop === "1") {
        return { ...time, stop: time.departure || time.arrive || "", railNumber: getRailNumber(time.railNumberID) };
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
  // 路線外到着/発着を駅ごとに取得（存在しない場合は undefined）
  const getOuterFor = (onedata: TrainData) => {
    const outerArr = (onedata as any).outerarrive;
    const outerDep = (onedata as any).outerdep;
    const findByStation = (list: any) => Array.isArray(list) ? list.find((o: any) => Number(o.id) === station.id) : undefined;
    return { outerArrive: findByStation(outerArr), outerDep: findByStation(outerDep) };
  };
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
          style={{ color: toABGR(typesA[Onedata_cell.type]?.color ?? 'transparent') }}
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
const TrainRow: React.FC<TrainRowProps> = ({ TrainDataA, station, rowIdx, typesA }) => {
  //判断用の関数を入れたい
  //console.log(station.layout);
  //console.log(layoutNameMap);
  //console.log(layoutNameMap[station.layout].values[0]);
  // `dir` を TrainData から取得し、layoutNameMap.values のインデックスを決定する
  const dir = TrainDataA && TrainDataA.length > 0 ? (TrainDataA[0].dir ?? 0) : 0;
  const vals = layoutNameMap[station.layout]?.values ?? [0, 0, 0, 0];
  // 到着は dir*2、発車は dir*2+1 を参照する
  const arriveFlag = vals[dir * 2] ?? 0;
  const departFlag = vals[dir * 2 + 1] ?? 0;
  //着発番線が入る場合
  if (arriveFlag == 1 && departFlag == 1) {

    return (
      <>
        <TrainRowParts
          key={`${station.id}-1`}
          TrainDataA={TrainDataA}
          station={station}
          rowIdx={rowIdx}
          show="arrive"
          typesA={typesA}
        />
        <TrainRowParts
          key={`${station.id}-2`}
          TrainDataA={TrainDataA}
          station={station}
          rowIdx={rowIdx}
          show="railNumber"
          typesA={typesA}
        />
        <TrainRowParts
          key={`${station.id}-3`}
          TrainDataA={TrainDataA}
          station={station}
          rowIdx={rowIdx}
          show="departure"
          typesA={typesA}
        />
      </>
    );
    //到着時刻のみの場合
  } else if (arriveFlag == 1) {
    return (
      <TrainRowParts
        key={station.id}
        TrainDataA={TrainDataA}
        station={station}
        rowIdx={rowIdx}
        show="arrive"
        typesA={typesA}
      />
    );
    //発車時刻のみの場合
  } else if (departFlag == 1)
    return (
      <TrainRowParts
        key={station.id}
        TrainDataA={TrainDataA}
        station={station}
        rowIdx={rowIdx}
        show="departure"
        typesA={typesA}
      />
    );
}
// OuterTerminal はヘッダー(onedata + stations) と行表示(TrainDataA + station) の両方で使われる
const OuterTerminal: React.FC<OuterTerminal> = ({ onedata, stations, showArr = true, showDep = true, cellType = 'th', bgColor }) => {
  //Cellにthもしくはtdを入れるようにする。
  const Cell: any = cellType === 'th' ? 'th' : 'td';
  if (!onedata) return <Cell className="TrainData"><div className="Outer-cell">&nbsp;</div></Cell>;
  //console.log(stations[0].OuterTerminal[0].jikoku);
  const getStationByID = (pointStationID: number, terminalStationID: number): string => {
    if (!stations || stations.length === 0 || pointStationID == null || terminalStationID == null) return "";
    //const sid = Number(id);
    //const st = stations[pointStationID].find(s => Number(s.terminalStationID) === terminalStationID);
    const st = stations[pointStationID].OuterTerminal[terminalStationID]
    return st ? st.jikoku : "";
  };

  const outerArr = Array.isArray(onedata.outerarrive) ? onedata.outerarrive[0] : onedata.outerarrive;
  const outerDep = Array.isArray(onedata.outerdep) ? onedata.outerdep[0] : onedata.outerdep;

  return (
    <Cell className="TrainData" key={`outer-${onedata.id}`} style={{ color: toABGR(bgColor) ?? 'transparent' }}>
      <div className="Outer-cell">
        <div className="Outer-seq"></div>
        {showArr ? (outerArr ? <div className="Outer-arrive">着: {outerArr.terminalTime ?? outerArr.pointTime}{outerArr.terminalStationID ? ` ${getStationByID(outerArr.pointStationID, outerArr.terminalStationID)}` : ""}</div> : <div className="Outer-empty">&nbsp;</div>) : null}
        {showDep ? (outerDep ? <div className="Outer-dep">発: {outerDep.terminalTime ?? outerDep.pointTime}{outerDep.terminalStationID ? ` ${getStationByID(outerDep.pointStationID, outerDep.terminalStationID)}` : ""}</div> : <div className="Outer-empty">&nbsp;</div>) : null}
      </div>
    </Cell>
  );
}

//時刻表示メインコンポーネント
const TrainDataTable: React.FC<TrainDataProps> = ({ TrainDataA, typesA, stationsA, diagrams }) => {
  const [selectedDia, setSelectedDia] = useState("1");
  const getTypeById = (id: number): string => {
    const TypeName = typesA[id]
    return TypeName ? TypeName.ryakushou : "TypeName Not Found";
  };
  //console.log(diagrams);
  //console.log(stationsA);
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
              <th
                className="TrainData"
                key={`${onedata.DiaLine}-${onedata.id}`}
                style={{ color: toABGR(typesA[onedata.type]?.color ?? 'transparent') }}
              >
                <div>{onedata.number}</div>
                <div>{getTypeById(onedata.type)}</div>
              </th>
            ))}
          </tr>
          <tr>
            <th className="tt-station-header"></th>
            {filteredTrainDataA.map((onedata) => (
              <OuterTerminal key={`${onedata.DiaLine}-${onedata.id}`} onedata={onedata} stations={stationsA} showArr={false} showDep={true} bgColor={typesA[onedata.type]?.color} />
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
              typesA={typesA}
            />
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th className="tt-station-footer"></th>
            {filteredTrainDataA.map((onedata) => (
              // tfoot では外着のみ表示（outerArr）
              <OuterTerminal key={`tfoot-${onedata.DiaLine}-${onedata.id}`} onedata={onedata} stations={stationsA} showArr={true} showDep={false} cellType="td" bgColor={typesA[onedata.type]?.color} />
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
};
export default TrainDataTable;