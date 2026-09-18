import type { TrainData } from '../types/timetable';
import { Time } from './Time';

export type DiagramDisplayMode = 'kudari' | 'nobori' | 'both';

export interface DiagramTrainGroup {
    trains: TrainData[];
    isNobori: boolean;
}

const MINUTES_PER_DAY = 24 * 60;

export function getDiagramMinutes(time: Time, kitenJikoku = 0): number {
    const startHour = Math.floor(kitenJikoku / 100);
    const startMinute = kitenJikoku % 100;
    const startTotalMinutes = startHour * 60 + startMinute;
    const totalMinutes = time.getHours() * 60 + time.getMinutes();

    return (totalMinutes - startTotalMinutes + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

export function getDiagramStartHour(kitenJikoku = 0): number {
    return Math.floor(kitenJikoku / 100) % 24;
}

export function getDiagramStationIndex(
    timeIndex: number,
    stationCount: number,
    isNobori: boolean
): number {
    return isNobori ? stationCount - 1 - timeIndex : timeIndex;
}

export function getDiagramTrainGroups(
    kudariTrains: TrainData[],
    noboriTrains: TrainData[],
    displayMode: DiagramDisplayMode
): DiagramTrainGroup[] {
    if (displayMode === 'kudari') {
        return [{ trains: kudariTrains, isNobori: false }];
    }
    if (displayMode === 'nobori') {
        return [{ trains: noboriTrains, isNobori: true }];
    }
    return [
        { trains: kudariTrains, isNobori: false },
        { trains: noboriTrains, isNobori: true },
    ];
}
