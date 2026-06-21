// NOTE: Do not import PrismaClient or create a client in `shared`.
// Database access must be provided by the caller (backend).
//import { upsertMultipleStations, findAllStations } from "../../backend/src/repositories/stationRepository.js";
import { Time } from '../utils/Time';
import type {
  Station,
  TrainType,
  TrainData,
  Diagrams,
  OudData,
  CreateTrainData,
  TrainStopTimeData,
} from "@shared/types/timetable.js";

/**
 * ===== OUDファイル解析関数群 =====
 */

/**
 * ファイルから=の後のデータを取得する
 */
function getDataFromFile(str: string): string {
  return str.substring(str.indexOf('=') + 1);
}

/**
 * キーワードでデータを取得する
 */
function getDataByKeyWord(keyWord: string, str: string): string {
  if (str.startsWith(keyWord)) {
    return str.substring(str.indexOf('=') + 1);
  }
  return "";
}

/**
 * 駅を追加する
 */
function addStation(
  countStation: number,
  stations: Station[],
  name: string,
  layout: string,
  main: string
): void {
  stations.push({
    id: countStation,
    name: name,
    layout: layout,
    main: main,
    railnumber: [],
    OuterTerminal: [],
  });
}

/**
 * レール番号を追加する
 */
function addRailNumber(
  td: number,
  countRailNumber: number,
  stations: Station[],
  name: string,
  ryakushou: string
): void {
  if (stations[td]) {
    stations[td].railnumber.push({
      id: countRailNumber,
      name: name,
      ryakushou: ryakushou,
    });
  }
}

/**
 * 路線外発着駅を追加する
 */
function addOuterTerminal(
  id: number,
  OuterStationID: number,
  stations: Station[],
  name: string,
  jikoku: string,
  diaryaku: string
): void {
  if (stations[id]) {
    // Frontend の型に合わせて最小の情報だけ格納する
    stations[id].OuterTerminal.push({
      id: OuterStationID,
      name: name,
      jikoku: jikoku,
      diaryaku: diaryaku,
    });
  }
}

/**
 * 列車種別を追加する
 */
function addTrainType(
  count: number,
  TrainType: TrainType[],
  name: string,
  Ryakushou: string,
  color: string
): void {
  TrainType.push({
    id: count,
    name: name,
    ryakushou: Ryakushou,
    color: color,
  });
}

/**
 * ダイアグラムを追加する
 */
function addDiagram(
  Diagram: Diagrams[],
  count: number,
  countDianame: string
): void {
  Diagram.push({
    id: count,
    name: countDianame,
  });
}

/**
 * 時刻データを処理する
 */
function timeToEnter(time: string, fileFormat: number): any[] {
  const pattern1 = /(\d+);(\d+)\/(\d+)/;
  const pattern2 = /(\d+);(\d+)/;
  let matches: any;

  if (!time.includes(',')) {
    return [{ stop: 0 }];
  }

  const Ltime: any[] = time.split(',');
  for (let s = 0; s < Ltime.length; s++) {
    let RailNumber: number;

    if (fileFormat === 2) {
      const RailNumberDevide = Ltime[s]?.split('$');
      if (RailNumberDevide && RailNumberDevide[0]) {
        Ltime[s] = RailNumberDevide[0];
        RailNumber = Number(RailNumberDevide[1]);
      } else {
        RailNumber = 1;
      }
    } else {
      RailNumber = 1;
    }

    if (!Ltime[s] || Ltime[s].length === 0) {
      Ltime[s] = { stop: 0 };
    } else if (Ltime[s].length === 1) {
      Ltime[s] = { stop: Ltime[s] };
    } else if (Ltime[s].endsWith('/')) {
      // 終着駅に発車時刻を入れない
      matches = Ltime[s].match(pattern2);
      Ltime[s] = {
        stop: matches ? matches[1] : 0,
        arrive: matches ? Time.fromString(matches[2]) : null,
        railNumberID: RailNumber,
      };
    } else if (Ltime[s].includes('/') && !Ltime[s].includes('$')) {
      matches = Ltime[s].match(pattern1);
      Ltime[s] = {
        stop: matches ? matches[1] : 0,
        arrive: matches ? Time.fromString(matches[2]) : null,
        departure: matches ? Time.fromString(matches[3]) : null,
        railNumberID: RailNumber,
      };
    } else {
      matches = Ltime[s].match(pattern2);
      Ltime[s] = {
        stop: matches ? matches[1] : 0,
        arrive: "",
        departure: matches ? Time.fromString(matches[2]) : null,
        railNumberID: RailNumber,
      };
    }
  }

  return Ltime;
}

/**
 * 列車データを追加する
 */
function addTrainData(
  td: number,
  DiaId: number,
  lines: string[],
  count: number,
  KudariData: TrainData[],
  NoboriData: TrainData[],
  fileFormat: number
): void {
  let _dir: number = 0;
  let _Type = "";
  let _number = "";
  let _name = "";
  let _time: any = [];
  const _OuterTerminal: any[] = [];
  const _OuterArrive: any[] = [];

  for (let _td = td; _td < td + 10 && _td < lines.length; _td++) {
    const line = lines[_td];
    if (!line || line === '.') {
      break;
    }

    if (line.startsWith('Houkou=Kudari')) _dir = 0;
    else if (line.startsWith('Houkou=Nobori')) _dir = 1;

    if (line.startsWith('Syubetsu=')) _Type = getDataFromFile(line);
    if (line.startsWith('Ressyabangou=')) _number = getDataFromFile(line);
    if (line.startsWith('EkiJikoku=')) _time = getDataFromFile(line);
    if (line.startsWith('Ressyamei=')) _name = getDataFromFile(line);

    if (line.startsWith('Operation') && line.includes('=4')) {
      const word = line.split('=');
      const Outer = word[1]?.split('/');
      if (Outer && Outer[1] && word[0]) {
        const _pointStationID = Number((word[0] || '').replace('Operation', '').slice(0, -1));
        const terminal: string = Outer[1];
        const _pointTimeRaw = Outer[2]?.replace('$', '') || '';
        const _terminalStationID = Number((terminal.split('$')[0] || '').trim()) || 0;
        const _terminalTimeRaw = terminal.split('$')[1] || '';

        const _terminalTime = _terminalTimeRaw ? Time.fromString(_terminalTimeRaw) : null;
        const _pointTime = _pointTimeRaw ? Time.fromString(_pointTimeRaw) : null;

        if (line.includes('B=4')) {
          _OuterTerminal.push({
            pointStationID: _pointStationID,
            terminalStationID: _terminalStationID,
            terminalTime: _terminalTime,
            pointTime: _pointTime,
          });
        } else if (line.includes('A=4')) {
          _OuterArrive.push({
            pointStationID: _pointStationID,
            terminalStationID: _terminalStationID,
            terminalTime: _pointTime,
            pointTime: _terminalTime,
          });
        }
      }
      continue;
    }
  }

  _time = timeToEnter(_time, fileFormat);

  const parsedType = Number(_Type) || 0;
  if (_dir === 0) {
    KudariData.push({
      DiaLine: DiaId,
      id: count,
      dir: _dir,
      type: parsedType,
      number: _number,
      name: _name,
      time: _time,
      outerdep: _OuterTerminal,
      outerarrive: _OuterArrive,
    });
  } else if (_dir === 1) {
    NoboriData.push({
      DiaLine: DiaId,
      id: count,
      dir: _dir,
      type: parsedType,
      number: _number,
      name: _name,
      time: _time,
      outerdep: _OuterTerminal,
      outerarrive: _OuterArrive,
    });
  }
}

/**
 * OUDファイルを解析する（メイン関数）
 * @param content - OUDファイルの内容（テキスト）
 * @param fileName - ファイル名
 * @returns 解析結果のOudDataオブジェクト
 */
export function parseOud(content: string, fileName: string): OudData {
  const lines = content.split("\n").map((line: string) => line.trim());

  // ここに一度データを定義する
  const stations: Station[] = [];
  const TrainType: TrainType[] = [];
  const KudariData: TrainData[] = [];
  const NoboriData: TrainData[] = [];
  const Diagrams: Diagrams[] = [];

  let count = 0;
  let countTrain = 0;
  let countStation = 0;
  let countDia: number = 0;
  let fileFormat: number = 0;

  // OudiaかSecondかを判定する
  if (lines[0]?.startsWith('FileType=OuDiaSecond')) {
    fileFormat = 2;
  } else if (lines[0]?.startsWith('FileType=OuDia.')) {
    fileFormat = 1;
  }

  for (let td = 0; td < lines.length; td++) {
    const line = lines[td];
    if (!line) continue;

    if (line.startsWith('Rosenmei')) {
      // 路線名をそのまま取得
      // var rosenmei = getDataFromFile(lines[td]);
    } else if (line.startsWith('Eki.')) {
      if (fileFormat === 1) {
        addStation(
          countStation,
          stations,
          getDataFromFile(lines[td + 1] || ''),
          getDataFromFile(lines[td + 2] || ''),
          getDataFromFile(lines[td + 3] || '')
        );
        lines.splice(td, 4);
        console.log(lines[td]);
      } else if (fileFormat === 2) {
        addStation(
          countStation,
          stations,
          getDataFromFile(lines[td + 1] || ''),
          getDataFromFile(lines[td + 2] || ''),
          getDataFromFile(lines[td + 3] || '')
        );

        while (td + 1 < lines.length && lines[td + 1] !== 'EkiTrack2.') {
          const nextLine = lines[td + 1];
          if (nextLine?.startsWith('BrunchCoreEkiIndex')) {
            const BrunchID: string = nextLine.replace('BrunchCoreEkiIndex=', '');
            const lastStation = stations[stations.length - 1];
            if (lastStation) {
              lastStation.BrunchFromStationID = Number(BrunchID);
            }
          }
          td++;
        }

        let railNumber: number = 0;
        let OuterStationID: number = 0;

        while (td + 1 < lines.length && lines[td + 1] === 'EkiTrack2.') {
          addRailNumber(
            countStation,
            railNumber,
            stations,
            getDataByKeyWord('TrackName=', lines[td + 2] || ''),
            getDataByKeyWord('TrackRyakusyou=', lines[td + 3] || '')
          );
          railNumber++;
          td += 4;
        }

        td++;

        // ここに駅の路線外発着駅を追加する
        while (td + 1 < lines.length && lines[td + 1] === 'OuterTerminal.') {
          addOuterTerminal(
            countStation,
            OuterStationID,
            stations,
            getDataFromFile(lines[td + 1] || ''),
            getDataFromFile(lines[td + 2] || ''),
            getDataFromFile(lines[td + 3] || '')
          );
          td += 5;
          OuterStationID++;
        }
      }

      countStation++;
    } else if (line.startsWith('Ressyasyubetsu.')) {
      addTrainType(
        count,
        TrainType,
        getDataFromFile(lines[td + 1] || ''),
        getDataFromFile(lines[td + 2] || ''),
        "#" + getDataFromFile(lines[td + 3] || '')
      );
      count++;

      if (fileName.endsWith('.oud')) {
        lines.splice(td + 1, 8);
      }
    } else if (line.startsWith('Ressya.')) {
      addTrainData(td, countDia, lines, countTrain, KudariData, NoboriData, fileFormat);
      countTrain++;
    }

    if (line.startsWith('Dia.')) {
      const AddDiagramName = (lines[td + 1] || '').replace('DiaName=', '');
      addDiagram(Diagrams, countDia, AddDiagramName);
      countDia++;
      countTrain = 0;
    }
  }

  const headers = lines[0]?.split(",") || [];
  const rows = lines.slice(1).map((line: string) => line.split(","));

  console.log('Diagrams:', Diagrams);
  return {
    headers,
    rows,
    rosenmei: "",
    stations,
    TrainType,
    KudariData,
    NoboriData,
    Diagrams,
  };
}

// shared/types/index.ts (など共通の型定義ファイルがあると想定)
export interface TrainTypeInput {
  code: string;
  name: string;
  shortName: string;
  color: string;
}
/**
 * OUDファイルの文字列、またはフロントから送られてきたデータから
 * 列車種別のリストを解析・抽出する（共通パース関数）
 */
export function parseTrainTypes(trainTypesRaw: any[]): TrainTypeInput[] {
  // ※もしここでテキストパースを行っている場合はその処理を書きます。
  // 今回は引数で生の配列を受け取って整形する想定のインターフェースにします。

  return trainTypesRaw.map((item) => ({
    code: String(item.code ?? item.id),
    name: String(item.name),
    shortName: String(item.shortName ?? item.ryakushou ?? ''),
    color: String(item.color || '00000000'), // OUDのデフォルト色
  }));
}
// Note: Do not automatically run imports when this module is executed.
// Database clients must be provided by the caller (backend). To run imports,
// call `importStations(prismaClient)` or `importTrainTypes(prismaClient)` from
// backend code that manages the Prisma client lifecycle.

/**
 * Timeオブジェクトから0時からの経過分を計算する
 * @param time - Timeオブジェクト（null可）
 * @returns 経過分数、またはundefined
 */
function timeToMinutes(time: Time | null | undefined): number | undefined {
  if (!time) return undefined;
  // Timeオブジェクトから hour と minute を取得（toJSON()を使用）
  const json = (time as any).toJSON ? (time as any).toJSON() : null;
  if (!json) return undefined;
  return json.hour * 60 + json.minute;
}

/**
 * TrainDataをDB保存用のCreateTrainDataに変換する
 * @param trainData - OUDパーサーから取得した列車データ
 * @returns DB保存用の列車データ
 */
export function convertTrainDataForDB(trainData: TrainData, totalStations: number): CreateTrainData {
  // 進行方向を文字列に変換
  const direction = trainData.dir === 0 ? 'Kudari' : 'Nobori';

  // 列車種別コードを取得
  const trainTypeCode = Number(trainData.type) || 0;

  // 各駅の時刻情報を変換
  const stopTimes: TrainStopTimeData[] = trainData.time.flatMap((entry: any, index: number) => {
    const stopStatus = parseInt(entry.stop, 10); // 0:経由なし, 1:停車, 2:通過 などのステータス
    if (stopStatus === 0) {
      return []; // 空配列を返すと、flatMapによって自動的に除外されます
    }

    // ★修正・防御ポイント
    let stationId: number;
    if (trainData.dir === 0) {
      // 下りはそのまま
      stationId = index;
    } else {
      // 上りの場合、基本は (総駅数 - 1 - index)
      const NoboriIndex = totalStations - 1 - index;
      if (NoboriIndex < 0) {
        console.log(NoboriIndex)
        stationId = 0;
      } else {
        stationId = NoboriIndex;
      }
      // 【防御策】もしデータがズレて stationId が 0 未満（負の数）になった場合のセーフティ
      if (stationId < 0) {
        console.warn(`[Warning] stationIdが負の数になりました。入力データを確認してください。index: ${index}, totalStations: ${totalStations}`);
        // データのズレによる不正登録を防ぐため、スキップする
        return [];
      }
    }

    // さらに、そもそも総駅数を超えたインデックスを指していないかもチェック
    if (stationId >= totalStations) {
      return [];
    }
    const arrivalMinute = timeToMinutes(entry.arrive);
    const departureMinute = timeToMinutes(entry.departure);
    // 通過駅判定：到着・発車時刻がどちらもない場合
    const isPass = stopStatus === 2 || (!entry.arrive && !entry.departure);

    return {
      stationId,
      arrivalMinute,
      departureMinute,
      trackName: entry.railNumberID ? String(entry.railNumberID) : undefined,
      isPass,
    };
  });

  // DB保存時に駅順（stationId昇順、または上りの場合は降順など）でソートしておくと、後の処理が楽になります
  // ここではstationIdの昇順で統一しておきます
  stopTimes.sort((a, b) => a.stationId - b.stationId);

  // 路線外発着をDB向けに変換（Time -> 分）
  const outerdep = (trainData.outerdep || []).map(o => ({
    pointStationID: Number(o.pointStationID) || 0,
    terminalStationID: Number(o.terminalStationID) || 0,
    terminalTime: timeToMinutes(o.terminalTime as any) || undefined,
    pointTime: timeToMinutes(o.pointTime as any) || undefined,
  }));

  const outerarrive = (trainData.outerarrive || []).map(o => ({
    pointStationID: Number(o.pointStationID) || 0,
    terminalStationID: Number(o.terminalStationID) || 0,
    terminalTime: timeToMinutes(o.terminalTime as any) || undefined,
    pointTime: timeToMinutes(o.pointTime as any) || undefined,
  }));

  return {
    trainNumber: trainData.number,
    trainName: trainData.name || undefined,
    direction,
    trainTypeCode,
    stopTimes,
    outerdep: outerdep.length ? outerdep : undefined,
    outerarrive: outerarrive.length ? outerarrive : undefined,
  };
}

/**
 * 複数の列車データを一括変換する
 * @param trainDataList - TrainData の配列
 * @param totalStations - 該当路線の総駅数
 * @returns CreateTrainData の配列
 */
export function convertMultipleTrainsForDB(trainDataList: TrainData[], totalStations: number): CreateTrainData[] {
  return trainDataList.map(td => convertTrainDataForDB(td, totalStations));
}
