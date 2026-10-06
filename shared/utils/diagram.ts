import type { Station, TrainData } from '../types/timetable';
import { Time } from './Time';

export type DiagramDisplayMode = 'kudari' | 'nobori' | 'both';

export interface DiagramTrainGroup {
    trains: TrainData[];
    isNobori: boolean;
}

export interface DiagramPoint {
    x: number;
    y: number;
}

export interface DiagramLineSegment {
    key: string;
    segmentKey: string;
    start: DiagramPoint;
    end: DiagramPoint;
    trainType: number;
    isBranchDwell: boolean;
}

export const DIAGRAM_MIN_ZOOM = 0.5;
export const DIAGRAM_MAX_ZOOM = 2;
export const DIAGRAM_ZOOM_STEP = 0.25;
export const DIAGRAM_HIT_TOLERANCE = 8;

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

export function getDiagramTrainKey(train: TrainData, isNobori: boolean): string {
    return `${isNobori ? 'nobori' : 'kudari'}-${train.DiaLine}-${train.id}`;
}

export function findDiagramTrainByKey(groups: DiagramTrainGroup[], key: string | null): TrainData | undefined {
    if (!key) return undefined;
    for (const { trains, isNobori } of groups) {
        const train = trains.find((item) => getDiagramTrainKey(item, isNobori) === key);
        if (train) return train;
    }
    return undefined;
}

export function getDiagramLineSegments(
    groups: DiagramTrainGroup[],
    stations: Station[],
    rowHeight: number,
    kitenJikoku = 0,
    xOffset = 0,
): DiagramLineSegment[] {
    return groups.flatMap(({ trains, isNobori }) => trains.flatMap((train, trainIndex) => {
        const segments: DiagramLineSegment[] = [];
        const trainKey = getDiagramTrainKey(train, isNobori);
        let previousPoint: DiagramPoint | null = null;
        let previousStationIndex: number | null = null;
        let segmentIndex = 0;

        train.time.forEach((entry, timeIndex) => {
            const stationIndex = getDiagramStationIndex(timeIndex, stations.length, isNobori);
            if (stationIndex < 0 || stationIndex >= stations.length) return;
            // Stop "2" is a pass-through; only "0" means this train does not use this station.
            if (String(entry.stop) === '0') {
                previousPoint = null;
                previousStationIndex = null;
                return;
            }
            // A branch row begins a separate station sequence in OUD2; do not draw across the other route.
            if (stations[stationIndex]?.branchCoreStationId !== undefined) {
                previousPoint = null;
                previousStationIndex = null;
            }
            const y = stationIndex * rowHeight + rowHeight / 2;

            (['arrive', 'departure'] as const).forEach((field) => {
                const time = entry[field];
                if (!(time instanceof Time)) return;

                const x = xOffset + getDiagramMinutes(time, kitenJikoku);
                if (previousPoint && x < previousPoint.x - 60) {
                    previousPoint = null;
                    previousStationIndex = null;
                }

                const point = { x, y };
                if (previousPoint) {
                    segments.push({
                        key: trainKey,
                        segmentKey: `${trainKey}-${trainIndex}-${segmentIndex++}`,
                        start: previousPoint,
                        end: point,
                        trainType: train.type,
                        isBranchDwell: previousStationIndex === stationIndex
                            && stations[stationIndex]?.branchCoreStationId !== undefined,
                    });
                }
                previousPoint = point;
                previousStationIndex = stationIndex;
            });
        });

        return segments;
    }));
}

export function findNearestDiagramTrainKey(
    segments: DiagramLineSegment[],
    point: DiagramPoint,
    maxDistance: number,
): string | null {
    let nearestKey: string | null = null;
    let nearestDistance = maxDistance;

    segments.forEach(({ key, start, end }) => {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const lengthSquared = dx * dx + dy * dy;
        const ratio = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
        const distance = Math.hypot(point.x - (start.x + ratio * dx), point.y - (start.y + ratio * dy));
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestKey = key;
        }
    });

    return nearestKey;
}

export function adjustDiagramZoom(current: number, direction: -1 | 1): number {
    return Math.min(DIAGRAM_MAX_ZOOM, Math.max(DIAGRAM_MIN_ZOOM, current + direction * DIAGRAM_ZOOM_STEP));
}

export function getDiagramLineWidth(isSelected: boolean): number {
    return isSelected ? 4 : 1;
}

export function getDiagramHitDistance(zoom: number): number {
    return DIAGRAM_HIT_TOLERANCE / zoom;
}
