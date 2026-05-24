// shared/types/timetable.ts

export interface StationDto {
  id: string;
  name: string;
  idKey: number;
}

export interface TrainTypeDto {
  id: string;
  name: string;
  idKey: number;
}

export interface TrainStopTimeDto {
  stationId: string;
  stationName: string;
  arrivalMinute: number | null;
  departureMinute: number | null;
  trackName: string | null;
}

export interface TrainDto {
  id: string;
  trainNumber: string;
  trainName: string | null;
  direction: 'Kudari' | 'Nobori';
  trainType: TrainTypeDto;
  stopTimes: TrainStopTimeDto[];
}