import { Time } from '../utils/Time';

/**
 * レール番号の型定義
 */
export interface RailNumber {
    id: number;
    name: string;
    ryakushou: string;
}

/**
 * 路線外発着駅の型定義
 */
export interface OuterTerminalStation {
    id: number;
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
