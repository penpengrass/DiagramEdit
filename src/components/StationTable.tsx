/*import React from "react";
import { Station, layoutNameMap } from '../constants/stationmap';
import { TrainData, TrainType, TimeEntry } from "../constants/Traindatamap";

//駅時刻表示メインコンポーネント
const StationTable: React.FC<TrainDataProps> = ({ TrainDataA, typesA, stationsA }) => {
  console.log(TrainDataA);
  return (
    <div>
      <table className="tt-table">
        <thead>
          <tr>
            <th className="tt-station-header"></th>
            {TrainDataA.map((onedata) => (
              <th className="TrainData" key={onedata.id}>
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
              TrainDataA={TrainDataA}
              station={station}
              rowIdx={rowIdx}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};
export default StationTable;*/