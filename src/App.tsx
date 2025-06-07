import { useState } from "react";
import SideBar from "./components/Sidebar.tsx";
// import DiaUploader from "./DiaUploader.tsx";
import DiaTable from "./components/DiaTable.tsx";
//import  from "./DiaTable.tsx"
import "./styles/App.css";
import CsvUploader from "./components/CsvUploader.tsx";
import DiaUploader from "./components/DiaUploader.tsx";
import StationShow from "./components/StationShow.tsx";
import TypeShow from "./components/TypeShow.tsx";
import TrainData from "./components/TrainData.tsx";
import Cell from "./Cell.tsx";
export type ComponentKey = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

/*const componentsMap = {
  A: {component:DiaTable,props:{CsvTableProps},
  //B: {component:StationShow,props:},
}*/
/*
    <div className="container">
      <SideBar />
      <DiaTable headers={headers} rows={rows}/>
      <DiaUploader onOudDataLoaded={setcsvData} />
    </div>
*/

const App: React.FC = () => {
  const [selected, setSelected] = useState<ComponentKey>('A');
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [DiaData, setOudData] = useState<any>([]);
  const [stationsA, setStationDataA] = useState<any>([]);
  const [stationsB, setStationDataB] = useState<any>([]);
  const [TrainTypeA, setTrainTypeData] = useState<any>([]);
  const [KudariDataA, setKudariTrainData] = useState<any>([]);
  const [NoboriDataA, setNoboriTrainData] = useState<any>([]);
  //<DiaTable data={DiaData} />
  //<StationShow stationsA={stationsA} />
  //<DiaTable data={DiaData} rows={csvData} />
  console.log(stationsA);
  console.log(stationsB);
  return (
    <div>
      <div className="container">
        <SideBar selected={selected} onSelect={setSelected} />
        <div className="component">
          <div className="header">
            CSVデータ取得：
            <CsvUploader onDataLoaded={setCsvData} />
            OuDiaデータ取得：
            <DiaUploader onOudDataLoaded={(data) => {
              setOudData(data);
              setStationDataA(data.stations);
              setStationDataB(data.stations);
              setTrainTypeData(data.TrainType);
              setKudariTrainData(data.KudariData);
              setNoboriTrainData(data.NoboriData);
            }}
              onCsvDataLoaded={setCsvData} />
          </div>
          <div className="mainComponent">
            {/* selected に応じて表示を切り替える(条件付きレンダリングを使用している) */}
            {selected === 'A' && <DiaTable data={[]} rows={csvData} />}
            {selected === 'B' && <StationShow stationsA={stationsA} />}
            {selected === 'C' && <TypeShow TrainTypeA={TrainTypeA} />}
            {selected === 'D' && <TrainData TrainDataA={KudariDataA} typesA={TrainTypeA} stationsA={stationsA} />}
            {selected === 'E' && <TrainData TrainDataA={NoboriDataA} typesA={TrainTypeA} stationsA={[...stationsA].reverse()} />}
            {selected === 'F' && <Cell />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;