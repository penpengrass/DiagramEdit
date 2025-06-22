import React from 'react';
import { layoutNameMap, mainNameMap,Station } from '../constants/stationmap';
//import Station from '/DiaUploader.tsx';
//import StationShow,{Station} from "./DiaUploader.tsx";

interface Props {
  stationsA: Station[];
}

const StationList: React.FC<Props> = ({ stationsA }) => {
  console.log(stationsA);
  //駅規模を「一般駅」とかにしたい、[main]はEkikibo...
  const getViewByObject = (main: string, map: { [key: string]: {label:string; values:number[]} }
  ): string => {
    //見つからない場合はmain(Ekikibo...)をそのまま返すという意味、Null合体演算子
    return map[main]?.label ?? main;
  };
  const getMainByObject = (main: string, map: { [key: string]: {label:string; value:number} }
  ): string => {
    //見つからない場合はmain(Ekikibo...)をそのまま返すという意味、Null合体演算子
    return map[main]?.label ?? main;
  };
  if (stationsA.length === 0) {
    return <div>No stations loaded.</div>;
  }
  return (
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>駅名</th>
          <th>表示形式</th>
          <th>駅規模</th>
        </tr>
      </thead>
      <tbody>
        {stationsA.map((station) => (
          <tr
            key={station.id}
            data-name={station.name}
            data-main={station.layout}
            data-layout={station.main}
          >
            <td>{station.id}</td>
            <td>{station.name}</td>
            <td>{getViewByObject(station.layout, layoutNameMap)}</td>
            <td>{getMainByObject(station.main, mainNameMap)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default StationList;
