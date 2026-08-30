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
