import { Station } from "../constants/stationmap";
//列車種別の一覧
export interface TrainType {
    id: number;
    name: string;
    ryakushou: string;
    color: string;
}
//ダイヤの種類
export interface Diagrams{
    id:number;
    name:string;
}
//1本の列車のデータ
export interface TrainData {
    DiaLine:Diagrams[];
    id: number;
    dir: number;
    type: number;
    number: string;
    name: string;
    time: TimeEntry[];
}
//1列車の1駅に対する情報
export interface TimeEntry {
    stop: string;
    arrive?: string;
    departure?: string;
    railNumber:string
    railNumberID: number;
}

export interface OudData {
    headers: string[];
    Diagrams:Diagrams[];
    rows: string[][];
    rosenmei: string;
    stations: Station[];
    TrainType: TrainType[];
    KudariData: TrainData[];
    NoboriData: TrainData[];
}