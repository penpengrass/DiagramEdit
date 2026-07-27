// frontend/src/components/TimeTableByDB.tsx
import { useEffect, useState } from 'react';
import { formatTime as sharedFormatTime } from '../utils/Time';

// 路線外発着の型定義（DBのOuterTime、OuterTerminalStationテーブルを想定）
interface OuterTimeData {
  id: number;
  trainId: number;
  pointStationId: number;       // 分岐・合流する自路線の駅ID
  terminalStationId: number | null; // 路線外の実際のターミナル駅ID（マスタ）
  terminalStationName: string; // バックエンド側でインクルードした駅名
  outerTerminalStation: {
    name: string;
  };
  pointTime: string | number;   // 分岐駅の時刻
  terminalTime: string | number;// 路線外ターミナル駅の時刻
}

interface TrainStopTime {
  stationId: number;
  arrivalMinute: number | null;
  departureMinute: number | null;
  trackName?: string;
  isPass: boolean;
}

interface TrainData {
  id: number;
  trainNumber: string;
  trainName?: string;
  direction: string;
  trainTypeCode: number;
  trainType?: {
    code: number;
    name: string;
  };
  stopTimes?: TrainStopTime[];
  // DBから一緒に取得することを想定した路線外発着プロパティ
  outerArrive?: OuterTimeData[]; // 終着側の直通先情報（配列または単一オブジェクト）
  outerDep?: OuterTimeData[];    // 始発側の直通先情報
}

interface Station {
  id: number;
  name: string;
}

// 路線外情報を表示するコンポーネント (TrainData.tsxの構造を移植)
interface OuterTerminalProps {
  onedata: TrainData;
  showArr?: boolean;
  showDep?: boolean;
  cellType?: 'th' | 'td';
  formatTimeFn: (time: any) => string; // 時刻フォーマット関数を受け取る
}

const OuterTerminal: React.FC<OuterTerminalProps> = ({ onedata, showArr = true, showDep = true, cellType = 'th', formatTimeFn }) => {
  const Cell = cellType === 'th' ? 'th' : 'td';

  // 配列・オブジェクトどちらでも安全に1件目を取得
  const outerArr = Array.isArray(onedata.outerArrive) ? onedata.outerArrive[0] : onedata.outerArrive;
  const outerDep = Array.isArray(onedata.outerDep) ? onedata.outerDep[0] : onedata.outerDep;
  console.log(outerArr)
  const cellStyle: React.CSSProperties = {
    border: '1px solid #ddd',
    padding: '8px',
    fontSize: '11px',
    fontWeight: 'normal',
    textAlign: 'center',
    backgroundColor: '#fff'
  };

  return (
    <Cell style={cellStyle}>
      <div style={{ minHeight: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {showDep && (
          outerDep ? (
            <div style={{ color: '#d32f2f' }}>
              発: {formatTimeFn ? formatTimeFn(outerDep.terminalTime) : outerDep.terminalTime} {outerDep.terminalStationName || `駅${outerDep.terminalStationId}`}
            </div>
          ) : (
            <div style={{ color: '#ccc' }}>&nbsp;</div>
          )
        )}
        {showArr && (
          outerArr ? (
            <div style={{ color: '#1976d2' }}>
              着: {formatTimeFn ? formatTimeFn(outerArr.terminalTime) : outerArr.terminalTime} {outerArr.terminalStationName || `駅${outerArr.terminalStationId}`}
            </div>
          ) : (
            <div style={{ color: '#ccc' }}>&nbsp;</div>
          )
        )}
      </div>
    </Cell>
  );
};

export const TimeTableByDB = () => {
  const [trainData, setTrainData] = useState<TrainData[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [outerTerminalNamesById, setOuterTerminalNamesById] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 絞り込み用の状態 (デフォルトは下り 'Kudari')
  const [directionFilter, setDirectionFilter] = useState<'Kudari' | 'Nobori'>('Kudari');
  // 表示件数制限（データ量が多いため、一旦5件に制限）
  const [displayLimit, setDisplayLimit] = useState<number>(5);

  useEffect(() => {
    // 駅情報とを列車データの両方を取得
    const fetchData = async () => {
      try {
        // 駅情報を取得
        const stationRes = await fetch('http://localhost:3000/api/stations');
        if (!stationRes.ok) throw new Error(`Station API error! status: ${stationRes.status}`);
        const stationResponse = await stationRes.json();
        const stationList = Array.isArray(stationResponse.data) ? stationResponse.data : stationResponse;
        setStations(stationList);

        // 路線外駅マスタ情報を取得
        const outerTerminalRes = await fetch('http://localhost:3000/api/outer-terminals');
        if (outerTerminalRes.ok) {
          const outerTerminalResponse = await outerTerminalRes.json();
          const outerTerminals: Array<{ id?: number; name?: string }> = Array.isArray(outerTerminalResponse)
            ? outerTerminalResponse
            : (Array.isArray(outerTerminalResponse?.data) ? outerTerminalResponse.data : []);

          const nameMap = outerTerminals.reduce<Record<number, string>>((acc, terminal) => {
            if (typeof terminal?.id === 'number' && typeof terminal?.name === 'string' && terminal.name.trim() !== '') {
              acc[terminal.id] = terminal.name;
            }
            return acc;
          }, {});
          setOuterTerminalNamesById(nameMap);
        } else {
          setOuterTerminalNamesById({});
        }

        // 列車データと路線外発着のデータを取得
        const trainRes = await fetch('http://localhost:3000/api/trains');
        if (!trainRes.ok) throw new Error(`Train API error! status: ${trainRes.status}`);
        const trainResponse = await trainRes.json();
        const trains = Array.isArray(trainResponse.data) ? trainResponse.data : trainResponse;
        const normalizedTrains = (Array.isArray(trains) ? trains : []).map((train: any) => {
          const outerTimes = Array.isArray(train.outerTimes)
            ? train.outerTimes
            : undefined;

          return {
            ...train,
            outerArrive: Array.isArray(train.outerArrive)
              ? train.outerArrive
              : outerTimes?.filter((outer: any) => outer.directionType === 'ARR'),
            outerDep: Array.isArray(train.outerDep)
              ? train.outerDep
              : outerTimes?.filter((outer: any) => outer.directionType === 'DEP'),
          };
        });

        console.log("=== [DEBUG] APIから取得した列車データ全件 ===", normalizedTrains);
        const sampleTrain = normalizedTrains.find((train: TrainData) => Boolean(train.trainNumber)) ?? normalizedTrains[1];
        if (sampleTrain) {
          console.log("=== [DEBUG] 列車サンプルのオブジェクト詳細 ===", {
            id: sampleTrain.id,
            trainNumber: sampleTrain.trainNumber,
            outerArrive: sampleTrain.outerArrive,
            outerDep: sampleTrain.outerDep,
          });
        }
        setTrainData(normalizedTrains);
        setError(null);
      } catch (err) {
        console.error("データ取得失敗:", err);
        setError("駅データまたは列車データの取得に失敗しました。");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 時刻を分数から "HHMM" 形式の文字列に変換（1桁の時間は先頭にスペース）
  const minuteToTimeString = (minute: number | null | undefined): string => {
    if (minute === null || minute === undefined) return '';
    const hours = Math.floor(minute / 60);
    const mins = minute % 60;
    const paddedHours = hours < 10 ? ' ' + hours.toString() : hours.toString().padStart(2, '0');
    const paddedMins = mins.toString().padStart(2, '0');
    return `${paddedHours}${paddedMins}`;
  };

  const formatTime = (minuteVal: number | string | null | undefined): string => {
    if (minuteVal === null || minuteVal === undefined || minuteVal === '') return '-';
    if (typeof minuteVal === 'string' && minuteVal.includes(':')) return minuteVal; // すでに "HH:MM" 形式の場合
    const num = Number(minuteVal);
    if (isNaN(num)) return String(minuteVal);
    return sharedFormatTime(minuteToTimeString(num));
  };

  // 線内の「実際の始発駅・終着駅」を割り出すロジック (TrainData.tsxより移植)
  const getTerminalStations = (train: TrainData) => {
    let start = '';
    let end = '';

    const isReal = (min: number | null | undefined) => min !== null && min !== undefined;

    // 表示上の駅順（orderedStations）に沿って走査
    for (let i = 0; i < orderedStations.length; i++) {
      const stop = train.stopTimes?.find((s) => s.stationId === orderedStations[i].id);
      if (stop && !stop.isPass && (isReal(stop.arrivalMinute) || isReal(stop.departureMinute))) {
        start = orderedStations[i].name;
        break;
      }
    }

    for (let i = orderedStations.length - 1; i >= 0; i--) {
      const stop = train.stopTimes?.find((s) => s.stationId === orderedStations[i].id);
      if (stop && !stop.isPass && (isReal(stop.arrivalMinute) || isReal(stop.departureMinute))) {
        end = orderedStations[i].name;
        break;
      }
    }

    return { start, end };
  };

  // 路線外発着の表示名を取得するロジック
  const getOuterName = (train: TrainData, isDeparture: boolean): string => {
    const outer = isDeparture
      ? (Array.isArray(train.outerDep) ? train.outerDep[0] : train.outerDep)
      : (Array.isArray(train.outerArrive) ? train.outerArrive[0] : train.outerArrive);

    if (!outer) return '';

    const lookupName = outer.terminalStationId != null
      ? outerTerminalNamesById[outer.terminalStationId]
      : undefined;

    const resolvedName = (
      outer.terminalStationName
      || outer.outerTerminalStation?.name
      || lookupName
      || (outer.terminalStationId ? `駅 ${outer.terminalStationId}` : '')
    );

    console.log('[OuterTerminalName]', {
      trainNumber: train.trainNumber,
      isDeparture,
      terminalStationId: outer.terminalStationId,
      pointStationId:outer.pointStationId,
      terminalStationName: outer.terminalStationName,
      outerTerminalStationName: outer.outerTerminalStation?.name,
      lookupName,
      resolvedName,
    });

    return resolvedName;
  };

  const isBetweenNonEmpty = (train: TrainData, stationIndex: number, field: 'arrival' | 'departure'): boolean => {
    const currentStation = orderedStations[stationIndex];
    const currentStop = train.stopTimes?.find((s) => s.stationId === currentStation.id);
    const currentValue = field === 'arrival' ? currentStop?.arrivalMinute : currentStop?.departureMinute;

    if (currentValue !== null && currentValue !== undefined) return false;

    const isReal = (minute: number | null | undefined): boolean => minute !== null && minute !== undefined;

    const above = orderedStations.slice(0, stationIndex).some((st) => {
      const stop = train.stopTimes?.find((s) => s.stationId === st.id);
      return isReal(field === 'arrival' ? stop?.arrivalMinute : stop?.departureMinute);
    });

    const below = orderedStations.slice(stationIndex + 1).some((st) => {
      const stop = train.stopTimes?.find((s) => s.stationId === st.id);
      return isReal(field === 'arrival' ? stop?.arrivalMinute : stop?.departureMinute);
    });

    return above && below;
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>読み込み中...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;
  }

  if (trainData.length === 0) {
    return <div style={{ padding: '20px' }}>登録された列車データがありません</div>;
  }

  // 選択された方向（上下線）に応じて、表示する列車をフィルタリングして制限
  const filteredTrains = trainData.filter((train) => train.direction === directionFilter);

  // 表示件数の制限（一部だけ表示）
  const partOfTrains = filteredTrains.slice(0, displayLimit);
  // TrainData.tsx と同様のロジック★
  // 上り（Nobori）の場合は駅一覧を逆順にし、下りの場合はそのままの順序にする
  const orderedStations = directionFilter === 'Nobori' ? [...stations].reverse() : stations;
  console.log(partOfTrains[1].outerDep)
  // 共通のヘッダーセルスタイル
  const thStyle: React.CSSProperties = {
    border: '1px solid #ddd',
    padding: '10px',
    backgroundColor: '#fafafa',
    fontWeight: 'bold',
    fontSize: '12px'
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>時刻表（データベース）</h2>

      {/* コントロール UI 領域 */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'center' }}>
        {/* 上下線切り替え（ラジオボタン） */}
        <div>
          <label style={{ marginRight: '15px', cursor: 'pointer' }}>
            <input
              type="radio"
              name="direction"
              value="Kudari"
              checked={directionFilter === 'Kudari'}
              onChange={() => setDirectionFilter('Kudari')}
            />
            下り列車
          </label>
          <label style={{ cursor: 'pointer' }}>
            <input
              type="radio"
              name="direction"
              value="Nobori"
              checked={directionFilter === 'Nobori'}
              onChange={() => setDirectionFilter('Nobori')}
            />
            上り列車
          </label>
        </div>

        {/* 表示件数の制御 */}
        <div>
          <label htmlFor="limit-select" style={{ marginRight: '5px' }}>表示列車数:</label>
          <select
            id="limit-select"
            value={displayLimit}
            onChange={(e) => setDisplayLimit(Number(e.target.value))}
          >
            <option value={3}>3本</option>
            <option value={5}>5本</option>
            <option value={10}>10本</option>
            <option value={50}>50本</option>
          </select>
          <span style={{ marginLeft: '10px', color: '#666', fontSize: '12px' }}>
            (該当全 {filteredTrains.length} 件中)
          </span>
        </div>
      </div>

      {/* 縦型時刻表テーブル */}
      {partOfTrains.length === 0 ? (
        <div style={{ color: '#666' }}>該当する列車がありません。</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: '13px', textAlign: 'center' }}>
            <thead>
              {/* 1行目: 列車番号 */}
              <tr style={{ backgroundColor: '#f4f4f4' }}>
                <th style={{ ...thStyle, minWidth: '120px', textAlign: 'left' }}>列車番号</th>
                {partOfTrains.map((train) => (
                  <th key={`num-${train.id}`} style={{ ...thStyle, minWidth: '90px' }}>
                    <div style={{ fontWeight: 'bold', color: '#005bac' }}>{train.trainNumber}</div>
                  </th>
                ))}
              </tr>

              {/* 2行目: 種別・列車名 */}
              <tr style={{ backgroundColor: '#f4f4f4' }}>
                <th style={{ ...thStyle, textAlign: 'left' }}>種別</th>
                {partOfTrains.map((train) => (
                  <th key={`type-${train.id}`} style={{ ...thStyle }}>
                    <div style={{ fontSize: '11px', color: '#555' }}>{train.trainType?.name || '種別名なし'}</div>
                    <div style={{ fontSize: '11px', color: '#555' }}>{train.trainName || ''}</div>
                  </th>
                ))}
              </tr>

              {/* 3行目: 始発駅（TrainData.tsx準拠） */}
              <tr>
                <th style={{ ...thStyle, textAlign: 'left' }}>始発駅</th>
                {partOfTrains.map((train) => {
                  const terms = getTerminalStations(train);
                  const outerName = getOuterName(train, true);
                  return (
                    <th key={`start-${train.id}`} style={{ ...thStyle, fontWeight: 'normal' }}>
                      <div style={{ color: outerName ? '#d32f2f' : '#000' }}>
                        {outerName || terms.start || ""}
                      </div>
                    </th>
                  );
                })}
              </tr>

              {/* 4行目: 終着駅（TrainData.tsx準拠） */}
              <tr>
                <th style={{ ...thStyle, textAlign: 'left' }}>終着駅</th>
                {partOfTrains.map((train) => {
                  const terms = getTerminalStations(train);
                  const outerName = getOuterName(train, false);
                  return (
                    <th key={`end-${train.id}`} style={{ ...thStyle, fontWeight: 'normal' }}>
                      <div style={{ color: outerName ? '#1976d2' : '#000' }}>
                        {outerName || terms.end || ""}
                      </div>
                    </th>
                  );
                })}
              </tr>

              {/* 5行目: 路線外始発（種別の下、駅一覧の上の位置） */}
              <tr>
                <th style={{ ...thStyle, textAlign: 'left' }}>路線外始発</th>
                {partOfTrains.map((train) => (
                  <OuterTerminal
                    key={`outer-dep-${train.id}`}
                    onedata={train}
                    showArr={false}
                    showDep={true}
                    cellType="th"
                    formatTimeFn={formatTime}
                  />
                ))}
              </tr>
            </thead>

            <tbody>
              {/* 駅一覧ループ */}
              {orderedStations.map((station, stationIndex) => (
                <tr key={station.id}>
                  <td style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#fafafa', fontWeight: 'bold', textAlign: 'left' }}>
                    {station.name}
                  </td>

                  {partOfTrains.map((train) => {
                    const stop = train.stopTimes?.find((s) => s.stationId === station.id);

                    if (!stop) {
                      return <td key={train.id} style={{ border: '1px solid #ddd', padding: '8px', color: '#ccc' }}>-</td>;
                    }

                    if (stop.isPass) {
                      return (
                        <td key={train.id} style={{ border: '1px solid #ddd', padding: '8px' }}>
                          <span style={{ color: '#aaa', fontSize: '11px' }}>レ</span>
                        </td>
                      );
                    }

                    const prevStation = stationIndex > 0 ? orderedStations[stationIndex - 1] : null;
                    const prevStop = prevStation ? train.stopTimes?.find((s) => s.stationId === prevStation.id) : null;

                    // --- 到着時刻の処理 ---
                    let arrivalDisplay = '';
                    if (stop.arrivalMinute !== null) {
                      const prevDeparture = prevStop?.departureMinute;
                      const isPrevEmpty = prevDeparture === null || prevDeparture === undefined;

                      if (isPrevEmpty && stop.departureMinute !== null) {
                        arrivalDisplay = '〇';
                      } else {
                        arrivalDisplay = formatTime(stop.arrivalMinute);
                      }
                    } else {
                      arrivalDisplay = '・・・';
                    }

                    if (arrivalDisplay === '・・・' && isBetweenNonEmpty(train, stationIndex, 'arrival')) {
                      arrivalDisplay = '||';
                    }

                    // --- 発車時刻の処理 ---
                    let departureDisplay = stop.departureMinute !== null
                      ? formatTime(stop.departureMinute)
                      : '・・・';

                    if (departureDisplay === '・・・' && isBetweenNonEmpty(train, stationIndex, 'departure')) {
                      departureDisplay = '||';
                    }

                    return (
                      <td key={train.id} style={{ border: '1px solid #ddd', padding: '8px' }}>
                        <div>
                          {arrivalDisplay !== '・・・' && arrivalDisplay !== '||' && (
                            <div style={{ fontSize: '11px', color: '#666' }}>着 {arrivalDisplay}</div>
                          )}
                          {departureDisplay !== '・・・' && departureDisplay !== '||' && (
                            <div style={{ fontWeight: 'bold' }}>発 {departureDisplay}</div>
                          )}
                          {arrivalDisplay === '||' && departureDisplay === '||' && (
                            <div style={{ color: '#aaa' }}>||</div>
                          )}
                          {arrivalDisplay === '・・・' && departureDisplay === '・・・' && (
                            <div style={{ color: '#ccc' }}>・・・</div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>

            {/* フッター: 路線外終着 */}
            <tfoot>
              <tr>
                <th style={{ ...thStyle, textAlign: 'left' }}>路線外終着</th>
                {partOfTrains.map((train) => (
                  <OuterTerminal
                    key={`outer-arr-${train.id}`}
                    onedata={train}
                    showArr={true}
                    showDep={false}
                    cellType="td"
                    formatTimeFn={formatTime}
                  />
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};