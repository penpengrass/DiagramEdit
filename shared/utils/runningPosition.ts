import type { Station, TrainData } from '../types/timetable';
import { Time } from './Time';
import { getOudTrainTerminalStations } from './timetableDisplay';

export interface RunningPositionStation {
    id: number;
    name: string;
    stationIndex: number;
}

export interface RunningPositionSection {
    id: string;
    fromStationId: number;
    fromStationName: string;
    toStationId: number;
    toStationName: string;
    sectionIndex: number;
}

export interface RunningPositionLayout {
    stations: RunningPositionStation[];
    sections: RunningPositionSection[];
}

export interface RunningPositionTrain {
    key: string;
    trainNumber: string;
    trainName: string;
    trainType: number;
    destination: string;
    direction: 'kudari' | 'nobori';
    positionType: 'station' | 'section';
    positionIndex: number;
}

interface ScheduledStop {
    stationIndex: number;
    isActive: boolean;
    arrival: number | null;
    departure: number | null;
}

function getTimeMinutes(time: unknown): number | null {
    return time instanceof Time ? time.getHours() * 60 + time.getMinutes() : null;
}

function getScheduledStops(train: TrainData, stations: Station[], isNobori: boolean): ScheduledStop[] {
    let previousTime: number | null = null;

    return train.time.map((entry, timeIndex) => {
        const stationIndex = isNobori ? stations.length - 1 - timeIndex : timeIndex;
        const rawArrival = getTimeMinutes(entry.arrive);
        const rawDeparture = getTimeMinutes(entry.departure);
        let arrival = rawArrival;
        let departure = rawDeparture;

        if (arrival !== null) {
            while (previousTime !== null && arrival < previousTime) arrival += 24 * 60;
            previousTime = arrival;
        }
        if (departure !== null) {
            while (previousTime !== null && departure < previousTime) departure += 24 * 60;
            previousTime = departure;
        }

        return {
            stationIndex,
            isActive: String(entry.stop) !== '0' && stationIndex >= 0 && stationIndex < stations.length,
            arrival,
            departure,
        };
    });
}

function getTrainPosition(
    stops: ScheduledStop[],
    selectedMinute: number,
): Pick<RunningPositionTrain, 'positionType' | 'positionIndex'> | null {
    const scheduledTimes = stops.flatMap((stop) => [stop.arrival, stop.departure])
        .filter((time): time is number => time !== null);
    if (scheduledTimes.length === 0) return null;

    const firstDay = Math.floor(Math.min(...scheduledTimes) / (24 * 60)) - 1;
    const lastDay = Math.floor(Math.max(...scheduledTimes) / (24 * 60)) + 1;

    for (let day = firstDay; day <= lastDay; day++) {
        const currentTime = selectedMinute + day * 24 * 60;

        for (const stop of stops) {
            if (!stop.isActive) continue;
            if (stop.arrival !== null && stop.departure !== null
                && currentTime >= stop.arrival && currentTime <= stop.departure) {
                return { positionType: 'station', positionIndex: stop.stationIndex };
            }
            if (stop.arrival !== null && stop.departure === null && currentTime === stop.arrival) {
                return { positionType: 'station', positionIndex: stop.stationIndex };
            }
            if (stop.arrival === null && stop.departure !== null && currentTime === stop.departure) {
                return { positionType: 'station', positionIndex: stop.stationIndex };
            }
        }

        for (let index = 0; index < stops.length; index++) {
            const from = stops[index];
            if (!from.isActive) continue;

            const departure = from.departure ?? from.arrival;
            if (departure === null) continue;

            for (let nextIndex = index + 1; nextIndex < stops.length; nextIndex++) {
                const to = stops[nextIndex];
                if (!to.isActive) break;

                const arrival = to.arrival ?? to.departure;
                if (arrival === null) continue;

                if (currentTime > departure && currentTime < arrival) {
                    const sectionCount = nextIndex - index;
                    const sectionDuration = (arrival - departure) / sectionCount;
                    if (sectionDuration <= 0) break;
                    const sectionOffset = Math.min(
                        sectionCount - 1,
                        Math.floor((currentTime - departure) / sectionDuration),
                    );
                    const sectionStart = stops[index + sectionOffset];
                    const sectionEnd = stops[index + sectionOffset + 1];

                    return {
                        positionType: 'section',
                        positionIndex: Math.min(sectionStart.stationIndex, sectionEnd.stationIndex),
                    };
                }
                break;
            }
        }
    }

    return null;
}

export function getRunningPositionLayout(stations: Station[]): RunningPositionLayout {
    const positionStations = stations.map((station, stationIndex) => ({
        id: station.id,
        name: station.name,
        stationIndex,
    }));

    const sections = positionStations.slice(0, -1).map((station, sectionIndex) => {
        const nextStation = positionStations[sectionIndex + 1];
        return {
            id: `${station.id}-${nextStation.id}-${sectionIndex}`,
            fromStationId: station.id,
            fromStationName: station.name,
            toStationId: nextStation.id,
            toStationName: nextStation.name,
            sectionIndex,
        };
    });

    return { stations: positionStations, sections };
}

export function getRunningPositionTrains(
    kudariTrains: TrainData[],
    noboriTrains: TrainData[],
    stations: Station[],
    selectedTime: string,
): RunningPositionTrain[] {
    const [hours, minutes] = selectedTime.split(':').map(Number);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes)
        || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return [];
    }
    const selectedMinute = hours * 60 + minutes;

    return [
        ...kudariTrains.map((train) => ({ train, direction: 'kudari' as const, isNobori: false })),
        ...noboriTrains.map((train) => ({ train, direction: 'nobori' as const, isNobori: true })),
    ].flatMap(({ train, direction, isNobori }) => {
        const position = getTrainPosition(getScheduledStops(train, stations, isNobori), selectedMinute);
        return position ? [{
            key: `${direction}-${train.DiaLine}-${train.id}`,
            trainNumber: train.number,
            trainName: train.name,
            trainType: train.type,
            destination: getOudTrainTerminalStations(
                train,
                isNobori ? [...stations].reverse() : stations,
            ).end,
            direction,
            ...position,
        }] : [];
    });
}
