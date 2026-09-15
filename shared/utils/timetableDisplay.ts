export type DisplayMinuteValue = number | string | null | undefined;

export type OuterTerminalLike = {
  terminalStationId?: number | null;
  terminalStationName?: string | null;
  outerTerminalStation?: { name?: string | null } | null;
  pointStationID?: number | string | null;
  terminalStationID?: number | string | null;
};

export type StopLike = {
  stationId?: number;
  arrivalMinute?: number | null;
  departureMinute?: number | null;
  isPass?: boolean;
};

export type TrainWithOuterTimes = {
  outerArrive?: OuterTerminalLike[] | OuterTerminalLike | null;
  outerDep?: OuterTerminalLike[] | OuterTerminalLike | null;
  stopTimes?: StopLike[];
};

export type StationLike = {
  id: number;
  name: string;
};

import type { Station, TimeEntry, TrainData, TrainType } from "../types/timetable";
import { formatTime } from "../utils/Time";

export type TrainDisplayCell = {
  arrival: string;
  departure: string;
  railNumber: string;
};

export type OudOuterTerminalDisplay = {
  name: string;
  time: string;
  text: string;
};

export type OudTrainHeaderDisplay = {
  key: string;
  number: string;
  direction: string;
  typeName: string;
  typeShortName: string;
  typeColor: string;
  startStation: string;
  endStation: string;
  outerDeparture: OudOuterTerminalDisplay;
  outerArrival: OudOuterTerminalDisplay;
};

export type OudTrainTableCellDisplay = {
  trainKey: string;
  value: string;
};

export type OudTrainTableStationRowDisplay = {
  key: string;
  stationId: number;
  stationName: string;
  mode: OudStationDisplayMode;
  cells: OudTrainTableCellDisplay[];
};

export type OudTrainTableDisplayModel = {
  columns: OudTrainHeaderDisplay[];
  stationRows: OudTrainTableStationRowDisplay[];
};

export type OudStationDisplayMode = "arrive" | "railNumber" | "departure";

const stationLayoutValues: Record<string, number[]> = {
  Jikokukeisiki_Hatsu: [0, 1, 0, 1],
  Jikokukeisiki_Chaku: [1, 0, 1, 0],
  Jikokukeisiki_Hatsuchaku: [1, 1, 1, 1],
  Jikokukeisiki_NoboriChaku: [0, 1, 1, 0],
  Jikokukeisiki_KudariChaku: [1, 0, 0, 1],
  Jikokukeisiki_NoboriHatsuchaku: [0, 1, 1, 1],
  Jikokukeisiki_KudariHatsuchaku: [1, 1, 0, 1],
};

export const getOudStationDisplayModes = (
  layout: string,
  direction: number,
): OudStationDisplayMode[] => {
  const values = stationLayoutValues[layout] ?? [0, 0, 0, 0];
  const arrive = values[direction * 2] === 1;
  const departure = values[direction * 2 + 1] === 1;

  if (arrive && departure) return ["arrive", "railNumber", "departure"];
  if (arrive) return ["arrive"];
  if (departure) return ["departure"];
  return [];
};

const isPlaceholder = (value: string): boolean =>
  value === "" || value === "・・・" || value === "レ" || value === "||";

const getRawTimeValue = (entry: TimeEntry | undefined, field: "arrive" | "departure"): string => {
  if (!entry) return "";
  if (entry.stop === "2") return "レ";
  if (entry.stop === "0") return "・・・";

  const value = entry[field];
  return value ? formatTime(value) : "";
};

const hasRealRawTime = (entry: TimeEntry | undefined, field: "arrive" | "departure"): boolean =>
  !isPlaceholder(getRawTimeValue(entry, field));

const getRawTimeWithGap = (
  train: TrainData,
  stationIndex: number,
  field: "arrive" | "departure",
): string => {
  const value = getRawTimeValue(train.time[stationIndex], field);
  if (value !== "・・・") return value;

  const hasTimeAbove = train.time
    .slice(0, stationIndex)
    .some((entry) => hasRealRawTime(entry, field));
  const hasTimeBelow = train.time
    .slice(stationIndex + 1)
    .some((entry) => hasRealRawTime(entry, field));

  return hasTimeAbove && hasTimeBelow ? "||" : value;
};

/** OUD の時刻データを、frontend と mobile が共有できる表示セルへ変換する。 */
export const getOudTrainDisplayCell = (
  train: TrainData,
  stationIndex: number,
  railNumber = "",
): TrainDisplayCell => {
  const entry = train.time[stationIndex];
  let arrival = getRawTimeWithGap(train, stationIndex, "arrive");
  const departure = getRawTimeWithGap(train, stationIndex, "departure");

  const previousDeparture = getRawTimeValue(train.time[stationIndex - 1], "departure");
  if (arrival === "" && previousDeparture !== "" && previousDeparture !== "・・・" && departure !== "") {
    arrival = "〇";
  } else if (arrival === "") {
    arrival = "・・・";
  }

  return {
    arrival,
    departure: departure || "・・・",
    railNumber: entry?.stop === "1" ? railNumber : entry?.stop === "0" ? "・・・" : "",
  };
};

export const getOudTrainTableDisplayModel = (
  trains: TrainData[],
  trainTypes: TrainType[],
  stations: Station[],
): OudTrainTableDisplayModel => {
  const columns = trains.map((train) => getOudTrainHeaderDisplay(train, trainTypes, stations));

  const stationRows = stations.flatMap((station, rowIdx) => {
    const direction = trains[0]?.dir ?? 0;

    return getOudStationDisplayModes(station.layout, direction).map((mode) => {
      const cells = trains.map((train) => {
        const entry = train.time[rowIdx];
        const railNumber = station.railnumber[entry?.railNumberID ?? -1]?.ryakushou ?? "";
        const displayCell = getOudTrainDisplayCell(train, rowIdx, railNumber);
        const value = mode === "arrive"
          ? displayCell.arrival
          : mode === "departure"
            ? displayCell.departure
            : displayCell.railNumber;

        return {
          trainKey: `${train.DiaLine}-${train.id}`,
          value,
        };
      });

      return {
        key: `${station.id}-${mode}`,
        stationId: station.id,
        stationName: station.name,
        mode,
        cells,
      };
    });
  });

  return { columns, stationRows };
};

export const getOudTrainTerminalStations = <T extends StationLike>(
  train: TrainData,
  stations: T[],
): { start: string; end: string } => {
  const outerDeparture = getOudOuterTerminalDisplay(train, stations, true);
  const outerArrival = getOudOuterTerminalDisplay(train, stations, false);
  const firstIndex = train.time.findIndex((entry) =>
    entry.stop !== "0" && entry.stop !== "2" && (entry.arrive || entry.departure),
  );
  const reverseIndex = [...train.time].reverse().findIndex((entry) =>
    entry.stop !== "0" && entry.stop !== "2" && (entry.arrive || entry.departure),
  );
  const lastIndex = reverseIndex < 0 ? -1 : train.time.length - reverseIndex - 1;

  return {
    start: outerDeparture.name || (firstIndex < 0 ? "" : stations[firstIndex]?.name ?? ""),
    end: outerArrival.name || (lastIndex < 0 ? "" : stations[lastIndex]?.name ?? ""),
  };
};

export const getOudOuterTerminalDisplay = <T extends StationLike>(
  train: TrainData,
  stations: T[],
  isDeparture: boolean,
): OudOuterTerminalDisplay => {
  const outer = toSingleOuterTime(isDeparture ? train.outerdep : train.outerarrive);
  if (!outer) return { name: "", time: "", text: "" };

  const pointStation = stations[Number(outer.pointStationID)] as T & {
    OuterTerminal?: { id: number; name: string }[];
  } | undefined;
  const terminal = pointStation?.OuterTerminal?.find(
    (candidate) => Number(candidate.id) === Number(outer.terminalStationID),
  );
  const name = terminal?.name ?? "";
  const time = formatTime(outer.terminalTime ?? outer.pointTime);
  const prefix = isDeparture ? "発" : "着";

  return {
    name,
    time,
    text: name || time ? `${prefix}: ${time}${name ? ` ${name}` : ""}` : "",
  };
};

export const getOudTrainHeaderDisplay = (
  train: TrainData,
  trainTypes: TrainType[],
  stations: Station[],
): OudTrainHeaderDisplay => {
  const trainType = trainTypes[train.type];
  const terminals = getOudTrainTerminalStations(train, stations);

  return {
    key: `${train.DiaLine}-${train.id}`,
    number: train.number,
    direction: train.dir === 0 ? "下り" : "上り",
    typeName: trainType?.name ?? "種別未定",
    typeShortName: trainType?.ryakushou ?? "種別未定",
    typeColor: trainType?.color ?? "",
    startStation: terminals.start,
    endStation: terminals.end,
    outerDeparture: getOudOuterTerminalDisplay(train, stations, true),
    outerArrival: getOudOuterTerminalDisplay(train, stations, false),
  };
};

export const toSingleOuterTime = <T>(value: T | T[] | null | undefined): T | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value ?? undefined;
};

export const isRealTimeValue = (value: number | null | undefined): boolean => {
  return value !== null && value !== undefined;
};

export const isEmptyDisplayValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") {
    const v = value.trim();
    return v === "" || v === "・・・" || v === "レ" || v === "||";
  }
  return false;
};

export const resolveOuterTerminalName = (
  outerTime: OuterTerminalLike | null | undefined,
  terminalNameMap: Record<number, string> = {}
): string => {
  if (!outerTime) return "";

  const lookupName = outerTime.terminalStationId != null
    ? terminalNameMap[outerTime.terminalStationId]
    : undefined;

  const resolvedName = (
    outerTime.terminalStationName ||
    outerTime.outerTerminalStation?.name ||
    lookupName ||
    (outerTime.terminalStationId ? `駅 ${outerTime.terminalStationId}` : "")
  );

  return resolvedName || "";
};

export const getTrainOuterName = <T extends TrainWithOuterTimes>(
  train: T,
  isDeparture: boolean,
  terminalNameMap: Record<number, string> = {}
): string => {
  const outer = isDeparture
    ? toSingleOuterTime(train.outerDep)
    : toSingleOuterTime(train.outerArrive);

  return resolveOuterTerminalName(outer ?? null, terminalNameMap);
};

export const getOrderedStations = <T extends StationLike>(
  stations: T[],
  direction: "Kudari" | "Nobori" | string
): T[] => {
  return direction === "Nobori" ? [...stations].reverse() : stations;
};

export const getTrainTerminalStations = <T extends StationLike>(
  train: TrainWithOuterTimes,
  orderedStations: T[]
): { start: string; end: string } => {
  let start = "";
  let end = "";

  for (let i = 0; i < orderedStations.length; i++) {
    const station = orderedStations[i];
    const stop = train.stopTimes?.find((s) => s.stationId === station.id);
    if (stop && !stop.isPass && (isRealTimeValue(stop.arrivalMinute) || isRealTimeValue(stop.departureMinute))) {
      start = station.name;
      break;
    }
  }

  for (let i = orderedStations.length - 1; i >= 0; i--) {
    const station = orderedStations[i];
    const stop = train.stopTimes?.find((s) => s.stationId === station.id);
    if (stop && !stop.isPass && (isRealTimeValue(stop.arrivalMinute) || isRealTimeValue(stop.departureMinute))) {
      end = station.name;
      break;
    }
  }

  return { start, end };
};

export const isBetweenNonEmpty = <T extends TrainWithOuterTimes>(
  train: T,
  stationIndex: number,
  field: "arrival" | "departure",
  orderedStations: StationLike[]
): boolean => {
  const currentStation = orderedStations[stationIndex];
  if (!currentStation) return false;

  const currentStop = train.stopTimes?.find((s) => s.stationId === currentStation.id);
  const currentValue = field === "arrival" ? currentStop?.arrivalMinute : currentStop?.departureMinute;

  if (currentValue !== null && currentValue !== undefined) return false;

  const above = orderedStations.slice(0, stationIndex).some((station) => {
    const stop = train.stopTimes?.find((s) => s.stationId === station.id);
    const value = field === "arrival" ? stop?.arrivalMinute : stop?.departureMinute;
    return isRealTimeValue(value as number | null | undefined);
  });

  const below = orderedStations.slice(stationIndex + 1).some((station) => {
    const stop = train.stopTimes?.find((s) => s.stationId === station.id);
    const value = field === "arrival" ? stop?.arrivalMinute : stop?.departureMinute;
    return isRealTimeValue(value as number | null | undefined);
  });

  return above && below;
};

export const formatDisplayMinute = (
  minuteVal: DisplayMinuteValue,
  fallback = "-"
): string => {
  if (minuteVal === null || minuteVal === undefined || minuteVal === "") return fallback;

  if (typeof minuteVal === "string") {
    if (minuteVal.includes(":")) return minuteVal;
    const num = Number(minuteVal);
    if (Number.isNaN(num)) return minuteVal;
    return formatDisplayMinute(num, fallback);
  }

  const hours = Math.floor(minuteVal / 60);
  const mins = minuteVal % 60;
  const paddedHours = hours < 10 ? ` ${hours}` : String(hours).padStart(2, "0");
  const paddedMins = String(mins).padStart(2, "0");
  return `${paddedHours}${paddedMins}`;
};
