import React from 'react';
//import Station from '/DiaUploader.tsx';
//import StationShow,{Station} from "./DiaUploader.tsx";
type Station = {
  id: number;
  name: string;
  main: string;
  layout: string;
};

interface Props {
  stationsA: Station[];
}
//駅規模を書き換える[]内にEkikiboが入り、:の後に日本語名を入れるという形になっている。別のところに応用できそう
const layoutNameMap: { [key: string]: string } = {
  Jikokukeisiki_Hatsu: "発時刻",
  Jikokukeisiki_Chaku: "着時刻",
  Jikokukeisiki_Hatsuchaku: "発着",
  Jikokukeisiki_NoboriChaku	: "上り着時刻",
  Jikokukeisiki_KudariChaku	: "下り着時刻",
  Jikokukeisiki_NoboriHatsuchaku	: "上り発着",
  Jikokukeisiki_KudariHatsuchaku	: "下り発着",
};
const mainNameMap: { [key: string]: string } = {
  Ekikibo_Ippan: "一般駅",
  Ekikibo_Syuyou: "主要駅",
};
const StationList: React.FC<Props> = ({ stationsA }) => {
  console.log(stationsA);
  //駅規模を「一般駅」とかにしたい、[main]はEkikibo...
  const getMainByObject = (main: string, map: { [key: string]: string }): string => {
    //見つからない場合はmain(Ekikibo...)をそのまま返すという意味、Null合体演算子
    return map[main] ?? main;
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
            <td>{getMainByObject(station.layout, layoutNameMap)}</td>
            <td>{getMainByObject(station.main, mainNameMap)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default StationList;
