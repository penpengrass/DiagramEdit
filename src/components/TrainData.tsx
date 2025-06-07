import React from "react";
import '../styles/TrainData.css'
interface TrainData {
  id: number;
  dir: number;
  type: number;
  number: string;
  time: TimeEntry[];
}

interface TrainType {
  id: number;
  name: string;
  ryakushou: string;
  color: string;
}

interface Station {
  id: number;
  name: string;
}

interface TimeEntry {
  stop: string;
  arrive?: string;
  departure?: string;
  railnumber?:number;
}
interface TrainDataProps {
  TrainDataA: TrainData[];
  typesA: TrainType[];
  stationsA: Station[];
}
const TrainDataTable: React.FC<TrainDataProps> = ({ TrainDataA, typesA, stationsA }) => {
  const getTypeById = (id: number): string => {
    const TypeName = typesA[id]
    return TypeName ? TypeName.ryakushou : "Not Found";
  };
  //3点リーダはtimeのpropsすべて渡すという意味
  const getTimeCell = (traindata: TrainData): TimeEntry[] => {
    //console.log(traindata.type);
    return traindata.time.map((time) => {
      if (time.stop === "2") {
        return { ...time, stop: "レ" };
      } else if (time.stop === "1") {
        return { ...time, stop: time.departure || "" };
      } else if (time.stop == "0") {
        return {...time, stop:"・・・"};
      }
      return time;
    });
  };
  console.log(TrainDataA);
  //  <div>
  //             <div className="tt-type">
  //                 {TrainDataA.map((traindata) => (
  //                     <div
  //                         className="TrainData"
  //                         key={traindata.id}
  //                         data-dir={traindata.dir}
  //                         data-time={JSON.stringify(traindata.time)}
  //                         data-type={traindata.type}
  //                         data-number={traindata.number}
  //                     >
  //                         <div>{traindata.number}</div>
  //                         <div>{getTypeById(traindata.type)}</div>
  //                     </div>
  //                 ))}
  //             </div>
  //         </div>
  // <th className="tt-station-header">
  //       {/* 駅名リスト */}
  //       {stationsA.map((station) => (
  //         <div className="tt-cell" key={station.id} data-name={station.name}>
  //           <div className="Station-cell">{station.name}</div>
  //         </div>
  //       ))}
  //     </th>
  return (



    // ...existing code...
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
          {stationsA.map((station, rowIdx) => (
            <tr key={station.id}>
              <td className="tt-station">
                <div className="Station-cell">{station.name}</div>
              </td>
              {TrainDataA.map((onedata) => (
                <td
                  className="CTimes"
                  key={onedata.id}
                  data-arrive={onedata.time[rowIdx]?.arrive}
                  data-departure={onedata.time[rowIdx]?.departure}
                >
                  <div className="tt-time" data-arrive={onedata.time[rowIdx]?.arrive} data-departure={onedata.time[rowIdx]?.departure}>
                    <div className="Time-cell">{getTimeCell(onedata)[rowIdx]?.stop}</div>
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    // ...existing code...

  );
};

export default TrainDataTable;