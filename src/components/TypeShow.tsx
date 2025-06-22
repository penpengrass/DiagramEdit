import React from 'react';
import { TrainType } from '../constants/Traindatamap';
interface Props {
  TrainTypeA: TrainType[];
}

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
        </tr>
      ))}
      </tbody>
    </table>
  )
}
export default TrainTypeList;