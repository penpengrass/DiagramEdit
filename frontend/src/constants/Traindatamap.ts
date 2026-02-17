import { Station } from "../constants/stationmap";
import { Time } from '../utils/Time';
//列車種別の一覧
export interface TrainType {
    id: number;
    name: string;
    ryakushou: string;
    color: string;
}
//ダイヤの種類
export interface Diagrams {
    id: number;
    name: string;
}
//1本の列車のデータ
export interface TrainData {
    DiaLine: Diagrams[];
    id: number;
    dir: number;
    type: number;
    number: string;
    name: string;
    time: TimeEntry[];
    //路線外発着の情報を追加する
    outerdep: OuterTime[];
    outerarrive: OuterTime[];
}
//1列車の1駅に対する情報
export interface TimeEntry {
    stop: string | Time;
    arrive: Time;
    departure: Time;
    railNumber: string
    railNumberID: number;
}
//1列車に関する、路線外発着を含めた駅処理を行う。入出区、入換を反映させる場合プロパティを追加する必要がある
export interface OuterTime {
    pointStationID: number;
    terminalStationID: number;
    terminalTime: Time;
    pointTime: Time;
}
export interface OudData {
    headers: string[];
    Diagrams: Diagrams[];
    rows: string[][];
    rosenmei: string;
    stations: Station[];
    TrainType: TrainType[];
    KudariData: TrainData[];
    NoboriData: TrainData[];
}