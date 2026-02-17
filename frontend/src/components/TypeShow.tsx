import React from 'react';
import { TrainType } from '../constants/Traindatamap';
interface Props {
  TrainTypeA: TrainType[];
}
// 16進色 -> ABGR (#AABBGGRR) に変換
export const toABGR = (hex: string): string => {
  if (!hex) return '';
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  //if (h.length === 8) { h = h.slice(2); } // AARRGGBB -> RRGGBB にする
  const r = "";
  const g = h.slice(2, 4);
  const b = h.slice(4, 6);
  const a = h.slice(6, 8);;
  return `#${a}${b}${g}${r}`.toUpperCase();
};
const TrainTypeList: React.FC<Props> = ({ TrainTypeA }) => {
  //console.log(TrainTypesA);
  if (TrainTypeA.length === 0) {
    return <div>No TrainTypes loaded.</div>;
  }
  return (
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>種別名</th>
          <th>略称</th>
          <th>色</th>
          <th>色(RGB変換)</th>
        </tr>
      </thead>
      <tbody>
        {TrainTypeA.map((TrainType) => (
          <tr
            key={TrainType.id}
            data-name={TrainType.name}
            data-main={TrainType.ryakushou}
            data-layout={TrainType.color}
          >
            <td>{TrainType.id}</td>
            <td>{TrainType.name}</td>
            <td>{TrainType.ryakushou}</td>
            <td>{TrainType.color}</td>
            <td title={TrainType.color}>{toABGR(TrainType.color)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
export default TrainTypeList;