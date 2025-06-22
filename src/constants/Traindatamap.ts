import { Station } from "../constants/stationmap";
export interface TrainType {
    id: number;
    name: string;
    ryakushou: string;
    color: string;
}
export interface TrainData {
    id: number;
    dir: number;
    type: number;
    number: string;
    name: string;
    time: TimeEntry[];
}

export interface TimeEntry {
    stop: string;
    arrive?: string;
    departure?: string;
    railnumberInto?: number;
}

export interface OudData {
    headers: string[];
    rows: string[][];
    rosenmei: string;
    stations: Station[];
    TrainType: TrainType[];
    KudariData: TrainData[];
    NoboriData: TrainData[];
}