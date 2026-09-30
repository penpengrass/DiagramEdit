import React, { useEffect, useRef, useState } from 'react';
import { Station } from '../constants/stationmap';
import { TrainData, TrainType } from '../constants/Traindatamap';
import { toABGR } from './TypeShow';
import TrainDataTable from './TrainData';
import { Time } from '../../../shared/utils/Time';
import {
    adjustDiagramZoom,
    DIAGRAM_MAX_ZOOM,
    DIAGRAM_MIN_ZOOM,
    findDiagramTrainByKey,
    findNearestDiagramTrainKey,
    getDiagramHitDistance,
    getDiagramMinutes,
    getDiagramLineSegments,
    getDiagramLineWidth,
    getDiagramStartHour,
    getDiagramStationIndex,
    getDiagramTrainGroups,
    getDiagramTrainKey,
    type DiagramLineSegment,
    type DiagramDisplayMode,
} from '../../../shared/utils/diagram';

interface Props {
    TrainDataA: TrainData[];
    NoboriTrainDataA: TrainData[];
    stationsA: Station[];
    typesA: TrainType[];
    kitenJikoku?: number;
}

const DiagramView: React.FC<Props> = ({ TrainDataA, NoboriTrainDataA, stationsA, typesA, kitenJikoku = 0 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const lineSegmentsRef = useRef<DiagramLineSegment[]>([]);
    const timeCanvasRef = useRef<HTMLCanvasElement>(null);
    const stationCanvasRef = useRef<HTMLCanvasElement>(null);
    const [displayMode, setDisplayMode] = useState<DiagramDisplayMode>('both');
    const [zoom, setZoom] = useState(1);
    const [selectedTrainKey, setSelectedTrainKey] = useState<string | null>(null);
    const selectedTrain = findDiagramTrainByKey(
        getDiagramTrainGroups(TrainDataA, NoboriTrainDataA, 'both'),
        selectedTrainKey,
    );
    const selectedTrainStations = selectedTrainKey?.startsWith('nobori-')
        ? [...stationsA].reverse()
        : stationsA;
    useEffect(() => {
        if (!canvasRef.current || !timeCanvasRef.current || !stationCanvasRef.current || !stationsA.length) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const timeCtx = timeCanvasRef.current.getContext('2d');
        const stationCtx = stationCanvasRef.current.getContext('2d');
        if (!ctx || !timeCtx || !stationCtx) return;
        const startHour = getDiagramStartHour(kitenJikoku);

        // キャンバスサイズの設定
        const leftMargin = 80;
        const width = 24 * 60;
        const height = stationsA.length * 40; // 駅1つあたり40px
        canvas.width = Math.round(width * zoom);
        canvas.height = Math.round(height * zoom);
        timeCanvasRef.current.width = Math.round(width * zoom);
        timeCanvasRef.current.height = Math.round(24 * zoom);
        stationCanvasRef.current.width = Math.round(leftMargin * zoom);
        stationCanvasRef.current.height = Math.round(height * zoom);
        ctx.scale(zoom, zoom);
        timeCtx.scale(zoom, zoom);
        timeCtx.scale(1 / zoom, 1 / zoom);
        stationCtx.scale(zoom, zoom);
        stationCtx.scale(1 / zoom, 1 / zoom);

        // 背景色
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // グリッドラインの描画（時刻上に）
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        for (let hour = 0; hour <= 24; hour++) {
            const x = hour * 60;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        // 駅ラインの描画（駅上に）
        ctx.strokeStyle = '#d0d0d0';
        for (let i = 0; i < stationsA.length; i++) {
            const y = i * 40 + 20;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // 駅名の描画（左側）
        stationCtx.fillStyle = '#ffffff';
        stationCtx.fillRect(0, 0, leftMargin * zoom, height * zoom);
        stationCtx.fillStyle = '#000000';
        stationCtx.font = '12px sans-serif';
        stationCtx.textAlign = 'right';
        stationCtx.textBaseline = 'middle';
        stationsA.forEach((station, index) => {
            const y = (index * 40 + 20) * zoom;
            stationCtx.fillText(station.name.substring(0, 6), 70, y);
        });
        timeCtx.fillStyle = '#ffffff';
        timeCtx.fillRect(0, 0, width * zoom, 24 * zoom);
        timeCtx.fillStyle = '#000000';
        timeCtx.font = 'bold 14px sans-serif';
        timeCtx.textAlign = 'center';
        timeCtx.textBaseline = 'bottom';
        for (let hour = 0; hour <= 24; hour++) {
            const displayHour = (startHour + hour) % 24;
            timeCtx.fillText(displayHour.toString().padStart(2, '0'), hour * 60 * zoom, 20);
        }
        const trainGroups = getDiagramTrainGroups(TrainDataA, NoboriTrainDataA, displayMode);
        const lineSegments = getDiagramLineSegments(trainGroups, stationsA.length, 40, kitenJikoku);
        lineSegmentsRef.current = lineSegments;
        trainGroups.forEach(({ trains, isNobori }) => trains.forEach((train, trainIndex) => {
            if (!train.time || train.time.length < 1) return;

            // 列車の色を取得
            //const trainType = typesA.find(t => t.id === train.type);
            const color = typesA[train.type].color || '#666666';
            ctx.strokeStyle = toABGR(color);
            const trainKey = getDiagramTrainKey(train, isNobori);
            ctx.lineWidth = getDiagramLineWidth(selectedTrainKey === trainKey);
            ctx.beginPath();
            let isFirstPoint = true;
            let pointCount = 0;
            //console.log(train.time.length);
            // 各駅の通過時刻をプロット
            for (let i = 0; i < train.time.length; i++) {
                const timeEntry = train.time[i];
                const arriveTime = timeEntry.arrive;
                const departureTime = timeEntry.departure;

                // 駅IDに対応するstationを探す
                const stationIndex = getDiagramStationIndex(i, stationsA.length, isNobori);
                if (stationIndex === -1) {
                    // デバッグ：駅が見つからない場合
                    console.warn(
                        `Train ${trainIndex}: railNumberID ${timeEntry.railNumberID} not found in stations`
                    );
                    continue;
                }

                const y = stationIndex * 40 + 20;

                // 到着時刻をプロット
                if (arriveTime && arriveTime instanceof Time) {
                    const totalMinutes = getDiagramMinutes(arriveTime, kitenJikoku);
                    const x = totalMinutes;

                    // 時刻が大幅に減少した場合（00:00を超えた）、線を途切させる
                    if (!isFirstPoint && i > 0) {
                        const prevTime = train.time[i - 1].arrive;
                        if (prevTime && prevTime instanceof Time) {
                            const prevTotalMinutes = getDiagramMinutes(prevTime, kitenJikoku);
                            if (totalMinutes < prevTotalMinutes - 60) {
                                ctx.stroke();
                                ctx.beginPath();
                                isFirstPoint = true;
                            }
                        }
                    }

                    if (isFirstPoint) {
                        ctx.moveTo(x, y);
                        isFirstPoint = false;
                    } else {
                        ctx.lineTo(x, y);
                    }
                    pointCount++;
                }

                // 出発時刻をプロット
                if (departureTime && departureTime instanceof Time) {
                    const totalMinutes = getDiagramMinutes(departureTime, kitenJikoku);
                    const x = totalMinutes;

                    // 時刻が大幅に減少した場合（00:00を超えた）、線を途切させる
                    if (!isFirstPoint && i > 0) {
                        const prevDeparture = train.time[i - 1].departure;
                        if (prevDeparture && prevDeparture instanceof Time) {
                            const prevTotalMinutes = getDiagramMinutes(prevDeparture, kitenJikoku);
                            if (totalMinutes < prevTotalMinutes - 60) {
                                ctx.stroke();
                                ctx.beginPath();
                                isFirstPoint = true;
                            }
                        }
                    }

                    if (isFirstPoint) {
                        ctx.moveTo(x, y);
                        isFirstPoint = false;
                    } else {
                        ctx.lineTo(x, y);
                    }
                    pointCount++;
                }
            }

            // 最低2点以上ある場合のみ線を描画
            if (pointCount >= 2) {
                ctx.stroke();
            }
        }));
    }, [TrainDataA, NoboriTrainDataA, stationsA, typesA, displayMode, kitenJikoku, zoom, selectedTrainKey]);

    const handleDiagramClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / zoom;
        const y = (event.clientY - bounds.top) / zoom;
        setSelectedTrainKey(findNearestDiagramTrainKey(lineSegmentsRef.current, { x, y }, getDiagramHitDistance(zoom)));
    };

    return (
        <div style={{ padding: '10px', height: '100%', boxSizing: 'border-box', display: 'flex', gap: '12px', overflow: 'hidden' }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <h2>ダイヤグラム</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexShrink: 0 }}>
                <button type="button" onClick={() => setZoom((current) => adjustDiagramZoom(current, -1))} disabled={zoom <= DIAGRAM_MIN_ZOOM}>
                    縮小
                </button>
                <span>{Math.round(zoom * 100)}%</span>
                <button type="button" onClick={() => setZoom((current) => adjustDiagramZoom(current, 1))} disabled={zoom >= DIAGRAM_MAX_ZOOM}>
                    拡大
                </button>
                <button type="button" onClick={() => setZoom(1)} disabled={zoom === 1}>
                    リセット
                </button>
            </div>
            <fieldset style={{ marginBottom: '12px', flexShrink: 0 }}>
                <legend>表示する列車</legend>
                <label>
                    <input
                        type="radio"
                        name="diagram-display-mode"
                        value="kudari"
                        checked={displayMode === 'kudari'}
                        onChange={() => setDisplayMode('kudari')}
                    />
                    下りのみ
                </label>
                <label>
                    <input
                        type="radio"
                        name="diagram-display-mode"
                        value="nobori"
                        checked={displayMode === 'nobori'}
                        onChange={() => setDisplayMode('nobori')}
                    />
                    上りのみ
                </label>
                <label>
                    <input
                        type="radio"
                        name="diagram-display-mode"
                        value="both"
                        checked={displayMode === 'both'}
                        onChange={() => setDisplayMode('both')}
                    />
                    両方
                </label>
            </fieldset>
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: `${80 * zoom}px ${1440 * zoom}px`, gridTemplateRows: `${24 * zoom}px ${stationsA.length * 40 * zoom}px`, width: 'max-content' }}>
                    <div style={{ position: 'sticky', top: 0, left: 0, zIndex: 3, background: '#fff', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                    <canvas ref={timeCanvasRef} style={{ position: 'sticky', top: 0, zIndex: 2, background: '#fff', borderTop: '1px solid #ccc', borderBottom: '1px solid #ccc', boxSizing: 'border-box' }} />
                    <canvas ref={stationCanvasRef} style={{ position: 'sticky', left: 0, zIndex: 2, background: '#fff', borderLeft: '1px solid #ccc', borderRight: '1px solid #ccc', boxSizing: 'border-box' }} />
                    <canvas ref={canvasRef} onClick={handleDiagramClick} style={{ border: '1px solid #cccccc', display: 'block', boxSizing: 'border-box', cursor: 'pointer' }} />
                </div>
            </div>
            </div>
            <div role="complementary" aria-label="列車情報表示領域" style={{ width: '320px', flexShrink: 0, minHeight: 0, overflowY: 'auto', borderLeft: '1px solid #ddd', paddingLeft: '12px', boxSizing: 'border-box' }}>
                <h3>列車時刻表</h3>
                {selectedTrain && (
                    <TrainDataTable
                        TrainDataA={[selectedTrain]}
                        typesA={typesA}
                        stationsA={selectedTrainStations}
                        diagrams={[]}
                        singleTrain
                    />
                )}
            </div>
        </div>
    );
};

export default DiagramView;
