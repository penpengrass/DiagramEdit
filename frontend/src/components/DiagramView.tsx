import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Station } from '../constants/stationmap';
import { Diagrams, TrainData, TrainType } from '../constants/Traindatamap';
import { toABGR } from './TypeShow';
import TrainDataTable from './TrainData';
import {
    adjustDiagramZoom,
    DIAGRAM_BASE_SCALE,
    DIAGRAM_MAX_ZOOM,
    DIAGRAM_MIN_ZOOM,
    DIAGRAM_STATION_SCALE,
    filterTrainsByDiagram,
    findDiagramTrainByKey,
    findNearestDiagramTrainKey,
    getDiagramHitDistance,
    getDiagramLineSegments,
    getDiagramLineWidth,
    getDiagramSelectionOptions,
    getDiagramStartHour,
    getDiagramTrainGroups,
    type DiagramLineSegment,
    type DiagramDisplayMode,
} from '../../../shared/utils/diagram';

interface Props {
    TrainDataA: TrainData[];
    NoboriTrainDataA: TrainData[];
    stationsA: Station[];
    typesA: TrainType[];
    diagrams: Diagrams[];
    kitenJikoku?: number;
}

const DiagramView: React.FC<Props> = ({ TrainDataA, NoboriTrainDataA, stationsA, typesA, diagrams, kitenJikoku = 0 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const lineSegmentsRef = useRef<DiagramLineSegment[]>([]);
    const timeCanvasRef = useRef<HTMLCanvasElement>(null);
    const stationCanvasRef = useRef<HTMLCanvasElement>(null);
    const [displayMode, setDisplayMode] = useState<DiagramDisplayMode>('both');
    const [selectedDia, setSelectedDia] = useState('1');
    const [zoom, setZoom] = useState(1);
    const renderScale = DIAGRAM_BASE_SCALE * zoom;
    const [selectedTrainKey, setSelectedTrainKey] = useState<string | null>(null);
    const diagramOptions = useMemo(() => getDiagramSelectionOptions(diagrams), [diagrams]);
    const selectedKudariTrains = useMemo(() => filterTrainsByDiagram(TrainDataA, selectedDia), [TrainDataA, selectedDia]);
    const selectedNoboriTrains = useMemo(() => filterTrainsByDiagram(NoboriTrainDataA, selectedDia), [NoboriTrainDataA, selectedDia]);
    const selectedDiagramGroups = getDiagramTrainGroups(selectedKudariTrains, selectedNoboriTrains, 'both');
    const selectedTrain = findDiagramTrainByKey(selectedDiagramGroups, selectedTrainKey);
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
        canvas.width = Math.round(width * renderScale);
        canvas.height = Math.round(height * renderScale);
        timeCanvasRef.current.width = Math.round(width * renderScale);
        timeCanvasRef.current.height = Math.round(24 * renderScale);
        stationCanvasRef.current.width = Math.round(leftMargin * DIAGRAM_STATION_SCALE);
        stationCanvasRef.current.height = Math.round(height * renderScale);
        ctx.scale(renderScale, renderScale);
        timeCtx.scale(renderScale, renderScale);
        timeCtx.scale(1 / renderScale, 1 / renderScale);
        stationCtx.scale(renderScale, renderScale);
        stationCtx.scale(1 / renderScale, 1 / renderScale);

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
        stationCtx.fillRect(0, 0, leftMargin * DIAGRAM_STATION_SCALE, height * renderScale);
        stationCtx.fillStyle = '#000000';
        stationCtx.font = '12px sans-serif';
        stationCtx.textAlign = 'right';
        stationCtx.textBaseline = 'middle';
        stationsA.forEach((station, index) => {
            const y = (index * 40 + 20) * renderScale;
            stationCtx.fillText(station.name.substring(0, 6), 70, y);
        });
        timeCtx.fillStyle = '#ffffff';
        timeCtx.fillRect(0, 0, width * renderScale, 24 * renderScale);
        timeCtx.fillStyle = '#000000';
        timeCtx.font = 'bold 14px sans-serif';
        timeCtx.textAlign = 'center';
        timeCtx.textBaseline = 'bottom';
        for (let hour = 0; hour <= 24; hour++) {
            const displayHour = (startHour + hour) % 24;
            timeCtx.fillText(displayHour.toString().padStart(2, '0'), hour * 60 * renderScale, 20);
        }
        const trainGroups = getDiagramTrainGroups(selectedKudariTrains, selectedNoboriTrains, displayMode);
        const lineSegments = getDiagramLineSegments(trainGroups, stationsA, 40, kitenJikoku);
        lineSegmentsRef.current = lineSegments;
        const segmentsByTrain = new Map<string, DiagramLineSegment[]>();
        lineSegments.forEach((segment) => {
            const trainSegments = segmentsByTrain.get(segment.key) ?? [];
            trainSegments.push(segment);
            segmentsByTrain.set(segment.key, trainSegments);
        });
        segmentsByTrain.forEach((segments, trainKey) => {
            const color = typesA[segments[0].trainType]?.color || '#666666';
            ctx.strokeStyle = toABGR(color);
            ctx.lineWidth = getDiagramLineWidth(selectedTrainKey === trainKey);
            ctx.beginPath();
            segments.forEach((segment) => {
                if (segment.isBranchDwell) {
                    const offset = 2;
                    ctx.moveTo(segment.start.x, segment.start.y - offset);
                    ctx.lineTo(segment.end.x, segment.end.y - offset);
                    ctx.moveTo(segment.start.x, segment.start.y + offset);
                    ctx.lineTo(segment.end.x, segment.end.y + offset);
                } else {
                    ctx.moveTo(segment.start.x, segment.start.y);
                    ctx.lineTo(segment.end.x, segment.end.y);
                }
            });
            ctx.stroke();
        });
    }, [selectedKudariTrains, selectedNoboriTrains, stationsA, typesA, displayMode, kitenJikoku, renderScale, selectedTrainKey]);

    const handleDiagramClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / renderScale;
        const y = (event.clientY - bounds.top) / renderScale;
        setSelectedTrainKey(findNearestDiagramTrainKey(lineSegmentsRef.current, { x, y }, getDiagramHitDistance(renderScale)));
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
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexShrink: 0 }}>
                    ダイヤ
                    <select
                        value={selectedDia}
                        onChange={(event) => {
                            setSelectedDia(event.target.value);
                            setSelectedTrainKey(null);
                        }}
                    >
                        {diagramOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
            </label>
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
                <div style={{ display: 'grid', gridTemplateColumns: `${80 * DIAGRAM_STATION_SCALE}px ${1440 * renderScale}px`, gridTemplateRows: `${24 * renderScale}px ${stationsA.length * 40 * renderScale}px`, width: 'max-content' }}>
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
