import React, { useEffect, useRef, useState } from 'react';
import { Station } from '../constants/stationmap';
import { TrainData, TrainType } from '../constants/Traindatamap';
import { toABGR } from './TypeShow';
import { Time } from '../../../shared/utils/Time';

interface Props {
    TrainDataA: TrainData[];
    NoboriTrainDataA: TrainData[];
    stationsA: Station[];
    typesA: TrainType[];
    kitenJikoku?: number;
}

type DisplayMode = 'kudari' | 'nobori' | 'both';

const DiagramView: React.FC<Props> = ({ TrainDataA, NoboriTrainDataA, stationsA, typesA, kitenJikoku = 0 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [displayMode, setDisplayMode] = useState<DisplayMode>('both');
    useEffect(() => {
        if (!canvasRef.current || !stationsA.length) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const startHour = Math.floor(kitenJikoku / 100);
        const startMinute = kitenJikoku % 100;
        const startTotalMinutes = startHour * 60 + startMinute;
        const toDiagramMinutes = (time: Time): number => {
            const totalMinutes = time.getHours() * 60 + time.getMinutes();
            return (totalMinutes - startTotalMinutes + 24 * 60) % (24 * 60);
        };

        // キャンバスサイズの設定
        const leftMargin = 80;
        const width = leftMargin + 24 * 60; // 左マージン + 24時間 × 60分
        const height = stationsA.length * 40; // 駅1つあたり40px
        canvas.width = width;
        canvas.height = height;

        // 背景色
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // グリッドラインの描画（時刻上に）
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        for (let hour = 0; hour <= 24; hour++) {
            const x = leftMargin + hour * 60; // 1時間 = 60分
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
        ctx.fillStyle = '#000000';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        stationsA.forEach((station, index) => {
            const y = index * 40 + 20;
            ctx.fillText(station.name.substring(0, 6), 70, y); // 駅名は最大6文字
        });
        console.log(stationsA);
        const trainGroups = displayMode === 'kudari'
            ? [{ trains: TrainDataA, isNobori: false }]
            : displayMode === 'nobori'
                ? [{ trains: NoboriTrainDataA, isNobori: true }]
                : [
                    { trains: TrainDataA, isNobori: false },
                    { trains: NoboriTrainDataA, isNobori: true },
                ];
        trainGroups.forEach(({ trains, isNobori }) => trains.forEach((train, trainIndex) => {
            if (!train.time || train.time.length < 1) return;

            // 列車の色を取得
            //const trainType = typesA.find(t => t.id === train.type);
            const color = typesA[train.type].color || '#666666';
            ctx.strokeStyle = toABGR(color);
            ctx.lineWidth = 2;
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
                const stationIndex = isNobori ? stationsA.length - 1 - i : i;
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
                    const totalMinutes = toDiagramMinutes(arriveTime);
                    const x = 80 + totalMinutes;

                    // 時刻が大幅に減少した場合（00:00を超えた）、線を途切させる
                    if (!isFirstPoint && i > 0) {
                        const prevTime = train.time[i - 1].arrive;
                        if (prevTime && prevTime instanceof Time) {
                            const prevTotalMinutes = toDiagramMinutes(prevTime);
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
                    const totalMinutes = toDiagramMinutes(departureTime);
                    const x = 80 + totalMinutes;

                    // 時刻が大幅に減少した場合（00:00を超えた）、線を途切させる
                    if (!isFirstPoint && i > 0) {
                        const prevDeparture = train.time[i - 1].departure;
                        if (prevDeparture && prevDeparture instanceof Time) {
                            const prevTotalMinutes = toDiagramMinutes(prevDeparture);
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
        // 時間ラベルの描画（上部）
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        for (let hour = 0; hour <= 24; hour++) {
            const displayHour = (startHour + hour) % 24;
            const x = 80 + hour * 60;
            ctx.fillText(displayHour.toString().padStart(2, '0'), x, 10);
        }

    }, [TrainDataA, NoboriTrainDataA, stationsA, typesA, displayMode, kitenJikoku]);

    return (
        <div style={{ padding: '10px', overflow: 'auto', height: '100%' }}>
            <h2>ダイヤグラム</h2>
            <fieldset style={{ marginBottom: '12px' }}>
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
            <canvas
                ref={canvasRef}
                style={{
                    border: '1px solid #cccccc',
                    display: 'block',
                }}
            />
        </div>
    );
};

export default DiagramView;