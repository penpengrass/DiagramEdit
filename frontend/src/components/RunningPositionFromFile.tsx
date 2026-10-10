import { useMemo, useState } from 'react';
import type { Station } from '../constants/stationmap';
import type { Diagrams, TrainData, TrainType } from '@shared/types/timetable';
import { getDiagramSelectionOptions } from '../../../shared/utils/diagram';
import { getRunningPositionLayout, getRunningPositionTrains, type RunningPositionTrain } from '../../../shared/utils/runningPosition';
import { toABGR } from './TypeShow';
import TrainDataTable from './TrainData';
import '../styles/RunningPosition.css';

interface Props {
    stationsA: Station[];
    kudariTrains: TrainData[];
    noboriTrains: TrainData[];
    trainTypes: TrainType[];
    diagrams: Diagrams[];
}

const STATION_ROW_HEIGHT = 76;
const STATION_LINE_OFFSET = 17;

function getCurrentTimeValue(): string {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

const RunningPositionFromFile: React.FC<Props> = ({ stationsA, kudariTrains, noboriTrains, trainTypes, diagrams }) => {
    const [displayTime, setDisplayTime] = useState(getCurrentTimeValue);
    const [selectedDiagram, setSelectedDiagram] = useState('1');
    const [selectedTrainKey, setSelectedTrainKey] = useState<string | null>(null);
    const layout = useMemo(() => getRunningPositionLayout(stationsA), [stationsA]);
    const diagramOptions = useMemo(() => getDiagramSelectionOptions(diagrams), [diagrams]);
    const selectedKudariTrains = useMemo(
        () => kudariTrains.filter((train) => String(train.DiaLine) === selectedDiagram),
        [kudariTrains, selectedDiagram],
    );
    const selectedNoboriTrains = useMemo(
        () => noboriTrains.filter((train) => String(train.DiaLine) === selectedDiagram),
        [noboriTrains, selectedDiagram],
    );
    const visibleTrains = useMemo(
        () => getRunningPositionTrains(
            selectedKudariTrains,
            selectedNoboriTrains,
            stationsA,
            displayTime,
        ),
        [selectedKudariTrains, selectedNoboriTrains, stationsA, displayTime],
    );
    const selectedTrain = selectedTrainKey
        ? [...selectedKudariTrains, ...selectedNoboriTrains].find(
            (train) => `${train.dir === 1 ? 'nobori' : 'kudari'}-${train.DiaLine}-${train.id}` === selectedTrainKey,
        )
        : undefined;
    const selectedTrainStations = selectedTrain?.dir === 1 ? [...stationsA].reverse() : stationsA;
    const handleTrainClick = (train: RunningPositionTrain) => {
        const trainId = Number(train.key.substring(train.key.lastIndexOf('-') + 1));
        setSelectedTrainKey(train.key);
        console.log('走行位置で選択した列車:', {
            position: train,
            kudariTrain: selectedKudariTrains.find(
                (candidate) => candidate.id === trainId,
            ),
            noboriTrain: selectedNoboriTrains.find(
                (candidate) => candidate.id === trainId,
            ),
        });
    };
    const trainsByPosition = useMemo(() => {
        const positions = new Map<string, RunningPositionTrain[]>();
        visibleTrains.forEach((train) => {
            const key = `${train.direction}-${train.positionType}-${train.positionIndex}`;
            positions.set(key, [...(positions.get(key) ?? []), train]);
        });
        return positions;
    }, [visibleTrains]);
    const renderTrainBadges = (trains: RunningPositionTrain[]) => trains.map((train) => {
        const trainType = trainTypes[train.trainType];
        const color = trainType?.color ? toABGR(trainType.color) : '#34495e';
        const trainTypeLabel = trainType?.ryakushou || trainType?.name || '種別未定';
        const label = [
            train.trainNumber.trim(),
            trainTypeLabel,
            train.destination,
        ].filter(Boolean).join(' ');
        return (
            <button
                type="button"
                className={`running-position__train${selectedTrainKey === train.key ? ' running-position__train--selected' : ''}`}
                key={train.key}
                title={[label, train.trainName].filter(Boolean).join(' ')}
                style={{ color, borderColor: color }}
                onClick={() => handleTrainClick(train)}
            >
                {label}
            </button>
        );
    });

    return (
        <section className="running-position">
            <div className="running-position__main">
            <header className="running-position__header">
                <h2>走行位置</h2>
                <label className="running-position__time-control">
                    表示時刻
                    <input
                        type="time"
                        value={displayTime}
                        onChange={(event) => setDisplayTime(event.target.value)}
                    />
                </label>
                <label className="running-position__time-control">
                    ダイヤ
                    <select value={selectedDiagram} onChange={(event) => {
                        setSelectedDiagram(event.target.value);
                        setSelectedTrainKey(null);
                    }}>
                        {diagramOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </label>
            </header>

            {layout.stations.length === 0 ? (
                <p className="running-position__empty">先にOuDiaファイルを読み込んでください。</p>
            ) : (
                <div className="running-position__scroll">
                    <div className="running-position__direction-labels">
                        <span>上り列車</span>
                        <span>路線</span>
                        <span>下り列車</span>
                    </div>
                    <div className="running-position__layout">
                        {layout.sections.map((section) => (
                            <div
                                className="running-position__section-trains"
                                key={`trains-${section.id}`}
                                style={{
                                    top: section.sectionIndex * STATION_ROW_HEIGHT + STATION_LINE_OFFSET + STATION_ROW_HEIGHT / 2,
                                }}
                                aria-label={`${section.fromStationName}から${section.toStationName}の列車`}
                            >
                                <div className="running-position__train-list">
                                    {renderTrainBadges(trainsByPosition.get(`nobori-section-${section.sectionIndex}`) ?? [])}
                                </div>
                                <div className="running-position__train-list">
                                    {renderTrainBadges(trainsByPosition.get(`kudari-section-${section.sectionIndex}`) ?? [])}
                                </div>
                            </div>
                        ))}
                        {layout.stations.slice(0, -1).map((station, index) => {
                            const nextStation = stationsA[index + 1];
                            const isBranchSection =
                                (nextStation?.branchCoreStationId !== undefined
                                    && nextStation.branchCoreStationId < nextStation.id)
                                || (stationsA[index]?.branchCoreStationId !== undefined
                                    && stationsA[index].branchCoreStationId > station.id);
                            if (!nextStation || isBranchSection) return null;

                            return (
                                <div
                                    className="running-position__center-line"
                                    key={`section-${station.id}-${nextStation.id}`}
                                    style={{
                                        top: index * STATION_ROW_HEIGHT + STATION_LINE_OFFSET,
                                        height: STATION_ROW_HEIGHT,
                                    }}
                                    aria-hidden="true"
                                />
                            );
                        })}
                        {layout.stations.map((station, index) => (
                            <div className="running-position__station-row" key={`station-${station.id}-${index}`}>
                                <div className="running-position__train-lane">
                                    <div className="running-position__train-list">
                                        {renderTrainBadges(trainsByPosition.get(`nobori-station-${index}`) ?? [])}
                                    </div>
                                </div>
                                <div className="running-position__station">
                                    <span className="running-position__station-marker" aria-hidden="true" />
                                    <span className="running-position__station-name">{station.name}</span>
                                </div>
                                <div className="running-position__train-lane">
                                    <div className="running-position__train-list">
                                        {renderTrainBadges(trainsByPosition.get(`kudari-station-${index}`) ?? [])}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            </div>
            <aside className="running-position__train-details" role="complementary" aria-label="列車情報表示領域">
                <h3>列車時刻表</h3>
                {selectedTrain && (
                    <TrainDataTable
                        TrainDataA={[selectedTrain]}
                        typesA={trainTypes}
                        stationsA={selectedTrainStations}
                        diagrams={[]}
                        singleTrain
                    />
                )}
            </aside>
        </section>
    );
};

export default RunningPositionFromFile;
