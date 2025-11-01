import React,{useState} from "react";
import '../styles/TrainData.css'
import { Station, layoutNameMap } from '../constants/stationmap';
import { TrainData, TrainType, TimeEntry } from "../constants/Traindatamap";

interface TrainDataProps {
  TrainDataA: TrainData[];
  typesA: TrainType[];
  stationsA: Station[];
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
const DiaSelect: React.FC <{value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  return(
    <select name="name" id="name" value={value} onChange={e => onChange(e.target.value)}>
      <option value="1">ダイヤ１</option>
      <option value="2">ダイヤ２</option>
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
        return { ...time, stop: "レ", arrive: time.arrive || "レ", departure: time.departure || "レ", railNumber:"||"};
      } else if (time.stop === "1") {
        return { ...time, stop: time.departure || "" , railNumber:getRailNumber(time.railNumberInto)};
      } else if (time.stop == "0") {
        return { ...time, stop: "・・・" , railNumber:getRailNumber(time.railNumberInto)};
      }
      return time;
    });
  };
  const getRailNumber=(id: number):string => {
    const RailNumber=station.railnumber[id];
    return RailNumber ? RailNumber.ryakushou : "";
  }
  return (
    <tr key={station.id}>
      <td className="tt-station">
        <div className="Station-cell">{station.name}</div>
      </td>
      {TrainDataA.map((onedata) => (
        <td
          className="CTimes"
          key={`${onedata.DiaLine}-${onedata.id}`}
          data-show={onedata.time[rowIdx]?.[show]}
        >
          <div className="tt-time" data-show={onedata.time[rowIdx]?.[show]}>
            <div className="Time-cell">{getTimeCell(onedata)[rowIdx]?.[show]}</div>
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
  //ここに着と発と番線を入れたい
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
const TrainDataTable: React.FC<TrainDataProps> = ({ TrainDataA, typesA, stationsA }) => {
   const [selectedDia, setSelectedDia] = useState("1");
  const getTypeById = (id: number): string => {
    const TypeName = typesA[id]
    return TypeName ? TypeName.ryakushou : "Not Found";
  };
  console.log(TrainDataA);
  //ここで、ダイヤ選択している
  const filteredTrainDataA = TrainDataA.filter((onedata) => String(onedata.DiaLine) === selectedDia);
  return (
    <div>
      <DiaSelect value={selectedDia} onChange={setSelectedDia} />
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