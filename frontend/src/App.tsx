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
import DataExport from "./components/DataExport.tsx";
import Cell from "./Cell.tsx";
import { StationList } from "./components/StationListByDB.tsx";
import { TrainTypeList } from "./components/TrainTypeListByDB.tsx";
//import { Diagrams } from "./constants/Traindatamap";
export type ComponentKey = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'I' | 'J' | 'K';
import StationTimeTable from "./components/StationTimeTable.tsx";
//import { Diagrams } from "./constants/Traindatamap";

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
  const [stations, setStationDataA] = useState<any>([]);
  //const [stationsB, setStationDataB] = useState<any>([]);
  const [TrainTypeA, setTrainTypeData] = useState<any>([]);
  const [KudariDataA, setKudariTrainData] = useState<any>([]);
  const [NoboriDataA, setNoboriTrainData] = useState<any>([]);
  const [Diagram, setDiagram] = useState<any>([]);
  //<DiaTable data={DiaData} />
  //<StationShow stationsA={stationsA} />
  //<DiaTable data={DiaData} rows={csvData} />
  //console.log(Diagram);
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
              setTrainTypeData(data.TrainType);
              setKudariTrainData(data.KudariData);
              setNoboriTrainData(data.NoboriData);
              setDiagram(data.Diagrams);
            }}
              onCsvDataLoaded={setCsvData} />
          </div>
          <div className="mainComponent">
            {/* selected に応じて表示を切り替える(条件付きレンダリングを使用している) */}
            {selected === 'A' && <DiaTable data={DiaData} rows={csvData} />}
            {selected === 'B' && <StationShow stationsA={stations} />}
            {selected === 'C' && <TypeShow TrainTypeA={TrainTypeA} />}
            {selected === 'D' && <TrainData TrainDataA={KudariDataA} typesA={TrainTypeA} stationsA={stations} diagrams={Diagram} />}
            {selected === 'E' && <TrainData TrainDataA={NoboriDataA} typesA={TrainTypeA} stationsA={[...stations].reverse()} diagrams={Diagram} />}
            {selected === 'F' && <Cell />}
            {selected === 'G' && <StationTimeTable KudariTrainDataA={KudariDataA} NoboriTrainDataA={NoboriDataA} typesA={TrainTypeA} stationsA={stations} diagrams={Diagram} />}
            {selected === 'I' && <DataExport stationsA={stations} />}
            {selected === 'J' && <StationList />}
            {selected === 'K' && <TrainTypeList />}
          </div >
        </div >
      </div >
    </div >
  );
};

export default App;