import { Time } from '../utils/Time';
// shared/types/timetable.ts

export interface TrainStopTime {
    stationId: string;
    stationName: string;
    arrivalMinute: number | null;
    departureMinute: number | null;
    trackName: string | null;
    isPass: boolean;
}

export interface Trains {
    id: string;
    trainNumber: string;
    trainName: string | null;
    direction: 'Kudari' | 'Nobori';
    trainType: TrainType;
    stopTimes: TrainStopTime[];
}
/**
 * レール番号の型定義(React Native用に将来的に?を付ける必要がある)
 */
export interface RailNumber {
    id: number;
    station_id: number;//所属する駅のID
    rail_id: number;//JSON内のインデックス
    name: string;
    ryakushou: string;
}

/**
 * 路線外発着駅の型定義
 */
export interface OuterTerminalStation {
    id: number;
    station_id:number; //路線外発着の接続駅のID
    terminal_id:number;//JSON内のインデックス
    name: string;
    jikoku: string;
    diaryaku: string;
}

/**
 * 駅の型定義
 */
export interface Station {
    id: number;
    name: string;
    main: string;
    layout: string;
    railnumber: RailNumber[];
    OuterTerminal: OuterTerminalStation[];
    BrunchFromStationID?: number;
}

/**
 * 列車種別の型定義
 */
export interface TrainType {
    id: number;
    name: string;
    ryakushou: string;
    color: string;
}

/**
 * ダイヤの型定義
 */
export interface Diagrams {
    id: number;
    name: string;
}

/**
 * 1列車の1駅に対する情報
 */
export interface TimeEntry {
    stop: string | Time;
    arrive?: Time;
    departure?: Time;
    railNumber?: string;
    railNumberID: number;
}

/**
 * 1列車に関する、路線外発着を含めた駅処理
 */
export interface OuterTime {
    pointStationID: string;
    terminalStationID: string;
    terminalTime: string;
    pointTime: string;
}

/**
 * 1本の列車のデータ
 */
export interface TrainData {
    DiaLine: number;
    id: number;
    dir: number;
    type: string;
    number: string;
    name: string;
    time: TimeEntry[];
    outerdep: OuterTime[];
    outerarrive: OuterTime[];
}

/**
 * OUDファイル解析結果
 */
export interface OudData {
    headers: string[];
    rows: string[][];
    rosenmei: string;
    stations: Station[];
    TrainType: TrainType[];
    KudariData: TrainData[];
    NoboriData: TrainData[];
    Diagrams: Diagrams[];
}

/**
 * DB保存用：列車の各駅での到着・発車時刻情報
 */
export interface TrainStopTimeData {
    stationId: number;
    arrivalMinute?: number; // 0時からの通算分数
    departureMinute?: number; // 0時からの通算分数
    trackName?: string; // 番線情報（例："1", "2"）
    isPass: boolean; // 通過フラグ
}

/**
 * DB保存用：1本の列車データ
 */
export interface CreateTrainData {
    trainNumber: string; // 列車番号（例："5031M"）
    trainName?: string; // 列車名（例："サンライズ瀬戸"）
    direction: 'Kudari' | 'Nobori'; // 進行方向
    trainTypeCode: number; // 列車種別のコード（oud2内でのインデックス）
    stopTimes: TrainStopTimeData[]; // 各駅での時刻情報
}
