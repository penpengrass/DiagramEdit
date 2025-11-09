import React from 'react';
import '../styles/Sidebar.css'
import { ComponentKey } from '../App'
interface Props {
  selected: ComponentKey;
  onSelect: (key: ComponentKey) => void;
}
/*const SideBar2: React.FC<Props> = ({ selected, onSelect }) => {
  const keys: ComponentKey[] = ['A'];
  return (
    <div>
      {keys.map((key) => (
        <button key={key} onClick={() => onSelect(key)} style={{
          fontWeight: selected === key ? 'bold' : 'normal',
        }}
        >
          Show {key}
        </button>
      ))}

    </div>
  )
}*/
const SideBar: React.FC<Props> = ({ onSelect }) => {
  /*const [currentComponent, setCurrentComponent] = useState<'A' | 'B'>('A');
  const [csvData, setCsvData] = useState<any>([]);
  const [DiaData, setOudData] =useState<any>([]);*/
  //{currentComponent === 'B' && <StationShow stationsA={StationList}/>}
  return (
    <>
      <aside id="SideBar">
        <p>サイドメニュー</p>
        <button onClick={() => onSelect('A')}>ファイル内容</button>
        <button onClick={() => onSelect('B')}>駅一覧</button>
        <button onClick={() => onSelect('C')}>列車種別</button>
        <button onClick={() => onSelect('D')}>下り列車</button>
        <button onClick={() => onSelect('E')}>上り列車</button>
        <button onClick={() => onSelect('F')}>表サンプル</button>
      </aside>
    </>
  )
}
export default SideBar