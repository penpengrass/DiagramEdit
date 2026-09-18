import React, { useState } from "react";
import '../styles/TrainData.css'
import { Station } from '../constants/stationmap';
import type { TrainData, TrainType, TimeEntry, Diagrams } from '../../../shared/types/timetable';
import { toABGR } from './TypeShow';
import {
  getOudTrainDisplayCell as sharedGetOudTrainDisplayCell,
  getOudTrainHeaderDisplay as sharedGetOudTrainHeaderDisplay,
  getOudTrainTableDisplayModel as sharedGetOudTrainTableDisplayModel,
  getOudTrainTerminalStations as sharedGetOudTrainTerminalStations,
  getOudStationDisplayModes as sharedGetOudStationDisplayModes,
} from '../../../shared/utils/timetableDisplay';
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
interface TerminalStationsProps{
  TrainDataA: TrainData[]; // 複数の列車オブジェクト（ヘッダーの列）
  stationsA: Station[];
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
      {TrainDataA.map((Onedata_cell) => {
        const displayCell = sharedGetOudTrainDisplayCell(
          Onedata_cell,
          rowIdx,
          getRailNumber(Onedata_cell.time[rowIdx]?.railNumberID),
        );
        const display = displayCell[show === "arrive" ? "arrival" : show === "departure" ? "departure" : "railNumber"];
        return (
          <td
            className="CTimes"
            key={`${Onedata_cell.DiaLine}-${Onedata_cell.id}`}
            data-show={Onedata_cell.time[rowIdx]?.[show]}
            style={{ color: toABGR(typesA[Onedata_cell.type]?.color ?? 'transparent') }}
          >
            <div className="tt-time" data-show={Onedata_cell.time[rowIdx]?.[show]}>
              <div className="Time-cell">{display}</div>
            </div>
          </td>
        );
      })}
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
  const direction = TrainDataA.length > 0 ? TrainDataA[0].dir ?? 0 : 0;
  return (
    <>
      {sharedGetOudStationDisplayModes(station.layout, direction).map((show) => (
        <TrainRowParts
          key={`${station.id}-${show}`}
          TrainDataA={TrainDataA}
          station={station}
          rowIdx={rowIdx}
          show={show}
          typesA={typesA}
        />
      ))}
    </>
  );
}
// OuterTerminal はヘッダー(onedata + stations) と行表示(TrainDataA + station) の両方で使われる
const getOuterTerminalName = (stations: Station[], pointStationID: number | string | undefined, terminalStationID: number | string | undefined): string => {
  if (!stations || stations.length === 0 || pointStationID == null || terminalStationID == null) return "";

  const pointId = Number(pointStationID);
  const terminalId = Number(terminalStationID);
  if (!Number.isFinite(pointId) || !Number.isFinite(terminalId)) return "";

  const pointStation = stations[pointId];
  if (!pointStation || !Array.isArray(pointStation.OuterTerminal)) return "";

  const target = pointStation.OuterTerminal.find((terminal) => {
    const id = Number(terminal.id);
    return Number.isFinite(id) && id === terminalId;
  });

  return target?.name || "";
};

const OuterTerminal: React.FC<OuterTerminal> = ({ onedata, stations, showArr = true, showDep = true, cellType = 'th', bgColor }) => {
  //Cellにthもしくはtdを入れるようにする。
  const Cell: any = cellType === 'th' ? 'th' : 'td';
  if (!onedata) return <Cell className="TrainData"><div className="Outer-cell">&nbsp;</div></Cell>;

  const outerArr = Array.isArray(onedata.outerarrive) ? onedata.outerarrive[0] : onedata.outerarrive;
  const outerDep = Array.isArray(onedata.outerdep) ? onedata.outerdep[0] : onedata.outerdep;

  const outerArrName = outerArr ? getOuterTerminalName(stations, outerArr.pointStationID, outerArr.terminalStationID) : "";
  const outerDepName = outerDep ? getOuterTerminalName(stations, outerDep.pointStationID, outerDep.terminalStationID) : "";

  const formatOuterTime = (timeValue: any): string => {
    if (timeValue == null) return "";
    return typeof timeValue === 'string' ? timeValue : timeValue.toString();
  };

  return (
    <Cell className="TrainData" key={`outer-${onedata.id}`} style={{ color: toABGR(bgColor) ?? 'transparent' }}>
      <div className="Outer-cell">
        <div className="Outer-seq"></div>
        {showArr ? (
          outerArr ? (
            <div className="Outer-arrive">
              着: {formatOuterTime(outerArr.terminalTime ?? outerArr.pointTime)}
              {outerArrName ? ` ${outerArrName}` : ""}
            </div>
          ) : (
            <div className="Outer-empty">&nbsp;</div>
          )
        ) : null}
        {showDep ? (
          outerDep ? (
            <div className="Outer-dep">
              発: {formatOuterTime(outerDep.terminalTime ?? outerDep.pointTime)}
              {outerDepName ? ` ${outerDepName}` : ""}
            </div>
          ) : (
            <div className="Outer-empty">&nbsp;</div>
          )
        ) : null}
      </div>
    </Cell>
  );
}
const TerminalStations: React.FC<TerminalStationsProps> = ({ TrainDataA, stationsA }) => {
  const getTerminalStations = (onedata: TrainData) => {
    return sharedGetOudTrainTerminalStations(onedata, stationsA);
  };
  //路線外発着駅を取得
  const getOuterName = (onedata: TrainData, OuterDeparture: boolean) => {
    const outerArr = Array.isArray(onedata.outerarrive) ? onedata.outerarrive[0] : onedata.outerarrive;
    const outerDep = Array.isArray(onedata.outerdep) ? onedata.outerdep[0] : onedata.outerdep;
    const target = OuterDeparture ? outerDep : outerArr;

    if (!target) return "";

    const pointStationId = Number(target.pointStationID);
    const terminalStationId = Number(target.terminalStationID);
    if (!Number.isFinite(pointStationId) || !Number.isFinite(terminalStationId)) {
      return "";
    }

    const pointStation = stationsA[pointStationId];
    if (!pointStation || !Array.isArray(pointStation.OuterTerminal)) {
      return "";
    }

    const terminal = pointStation.OuterTerminal.find((station) => Number(station.id) === terminalStationId);
    return terminal?.name || "";
  };

  return (
    <>
      <tr>
        <th className="tt-station-header">始発駅</th>
        {TrainDataA.map((onedata) => {
          const terms = getTerminalStations(onedata);
          const outerName = getOuterName(onedata, true);
          return (
            <th className="TrainData" key={`start-${onedata.DiaLine}-${onedata.id}`}>
              <div className="Terminal-start">{outerName || terms.start || ""}</div>
            </th>
          );
        })}
      </tr>
      <tr>
        <th className="tt-station-header">終着駅</th>
        {TrainDataA.map((onedata) => {
          const terms = getTerminalStations(onedata);
          const outerName = getOuterName(onedata, false);
          return (
            <th className="TrainData" key={`end-${onedata.DiaLine}-${onedata.id}`}>
              <div className="Terminal-end">{outerName || terms.end || ""}</div>
            </th>
          );
        })}
      </tr>
    </>
  );
}
//時刻表示メインコンポーネント
const TrainDataTable: React.FC<TrainDataProps> = ({ TrainDataA, typesA, stationsA, diagrams }) => {
  const [selectedDia, setSelectedDia] = useState("1");

  const filteredTrainDataA = TrainDataA.filter((onedata) => String(onedata.DiaLine) === selectedDia);
  const displayModel = sharedGetOudTrainTableDisplayModel(filteredTrainDataA, typesA, stationsA);

  return (
    <div>
      <DiaSelect value={selectedDia} onChange={setSelectedDia} diagrams={diagrams} />
      <table className="tt-table">
        <thead>
          {displayModel.headerRows.slice(0, 4).map((row) => (
            <tr key={row.key}>
              <th className="tt-station-header">{row.label}</th>
              {row.values.map((cell) => {
                const header = displayModel.columns.find((column) => column.key === cell.trainKey);
                return (
                  <th
                    className="TrainData"
                    key={`${row.key}-${cell.trainKey}`}
                    style={{ color: toABGR(header?.typeColor || 'transparent') }}
                  >
                    <div>{cell.value}</div>
                  </th>
                );
              })}
            </tr>
          ))}
          <tr>
            <th className="tt-station-header">路線外始発</th>
            {filteredTrainDataA.map((onedata) => (
              <OuterTerminal key={`${onedata.DiaLine}-${onedata.id}`} onedata={onedata} stations={stationsA} showArr={false} showDep={true} bgColor={typesA[onedata.type]?.color} />
            ))}
          </tr>
        </thead>
        <tbody>
          {displayModel.stationRows.map((row) => (
            <tr key={row.key}>
              <td className="tt-station">
                <div className="Station-cell">{row.mode === "railNumber" ? "発着番線" : row.stationName}</div>
              </td>
              {row.cells.map((cell) => (
                <td
                  key={`${row.key}-${cell.trainKey}`}
                  className="CTimes"
                  style={{ color: toABGR(cell.typeColor || 'transparent') }}
                >
                  <div className="tt-time">
                    <div className="Time-cell">{cell.value}</div>
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th className="tt-station-footer">{displayModel.headerRows[5]?.label ?? "路線外終着"}</th>
            {filteredTrainDataA.map((onedata) => (
              <OuterTerminal key={`tfoot-${onedata.DiaLine}-${onedata.id}`} onedata={onedata} stations={stationsA} showArr={true} showDep={false} cellType="td" bgColor={typesA[onedata.type]?.color} />
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
};
export default TrainDataTable;