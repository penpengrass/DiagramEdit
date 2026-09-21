import type { Station, TrainData, TrainType } from '../types/timetable';

export type StationTimetableDirection = 'down' | 'up';

export interface StationTimetableRow {
  hour: number;
  minutes: number;
  trainNumber: string;
  typeName: string;
  trainType: number;
  terminal: string;
}

export interface StationTimetableOptions {
  kudariTrainData: TrainData[];
  noboriTrainData: TrainData[];
  types: TrainType[];
  stations: Station[];
  selectedStation: string | number;
  selectedDia: string | number;
  direction: StationTimetableDirection;
}

const isRealTime = (value: unknown): boolean => {
  if (value == null || value === '') return false;
  return !(typeof value === 'string' && ['', '・・・', 'レ', '||'].includes(value.trim()));
};

const getHour = (value: unknown): number | null => {
  if (!isRealTime(value)) return null;
  const match = String(value).trim().match(/^(\d{1,2}):?(\d{2})$/);
  return match ? Number(match[1]) : null;
};

const getMinutes = (value: unknown): number => {
  const match = String(value).match(/(\d{1,2}):?(\d{2})/);
  if (match) return Number(match[2]);
  const valueString = String(value);
  return valueString.length >= 2 ? Number(valueString.slice(-2)) : 0;
};

const getTerminalStation = (
  train: TrainData,
  stations: Station[],
  direction: StationTimetableDirection,
): string => {
  const outerArrive = Array.isArray(train.outerarrive) ? train.outerarrive[0] : train.outerarrive;
  if (outerArrive) {
    if (outerArrive.terminalStationID) {
      const stationIndex = direction === 'down'
        ? outerArrive.pointStationID
        : stations.length - outerArrive.pointStationID - 1;
      return stations[stationIndex]?.OuterTerminal?.[outerArrive.terminalStationID]?.name ?? '';
    }
    if (outerArrive.pointStationID != null) {
      return stations[outerArrive.pointStationID]?.name ?? '';
    }
  }

  for (let index = train.time.length - 1; index >= 0; index -= 1) {
    const time = train.time[index];
    if (time && (isRealTime(time.arrive) || isRealTime(time.departure))) {
      const stationIndex = direction === 'down' ? index : stations.length - index - 1;
      return stations[stationIndex]?.name ?? '';
    }
  }
  return '';
};

export const getStationTimetable = ({
  kudariTrainData,
  noboriTrainData,
  types,
  stations,
  selectedStation,
  selectedDia,
  direction,
}: StationTimetableOptions): StationTimetableRow[] => {
  const stationNumber = Number(selectedStation);
  const stationIndex = direction === 'down'
    ? stationNumber - 1
    : stations.length - stationNumber;
  const diagramId = String(selectedDia);
  const directionValue = direction === 'down' ? 0 : 1;
  const source = direction === 'down' ? kudariTrainData : noboriTrainData;

  return source
    .filter((train) => String(train.DiaLine) === diagramId && (train.dir ?? 0) === directionValue)
    .flatMap((train) => {
      const time = train.time[stationIndex];
      if (!time) return [];

      const value = isRealTime(time.departure) ? time.departure : time.arrive;
      const hour = getHour(value);
      if (hour == null) return [];

      return [{
        hour,
        minutes: getMinutes(value),
        trainNumber: String(train.number),
        typeName: types[train.type]?.name || types[train.type]?.ryakushou || '',
        trainType: train.type,
        terminal: getTerminalStation(train, stations, direction),
      }];
    })
    .sort((left, right) => left.hour - right.hour || left.minutes - right.minutes);
};

export const getStationTimetableHours = (): number[] => (
  Array.from({ length: 24 }, (_, index) => index).slice(4)
    .concat(Array.from({ length: 4 }, (_, index) => index))
);
