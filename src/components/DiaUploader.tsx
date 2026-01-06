import React from "react";
export let FileFormat: number = 0; // ここでグローバルに定義
import { Station } from "../constants/stationmap";
import { TrainData, TrainType, OudData, Diagrams } from "../constants/Traindatamap";
import { Time } from '../utils/Time'; // 👈 Timeクラスをインポート
interface DiaUploaderProps {
    onOudDataLoaded: (data: any) => void;
    onCsvDataLoaded: (rows: any) => void;
}
const DiaUploader: React.FC<DiaUploaderProps> = ({ onOudDataLoaded, onCsvDataLoaded }) => {
    //2つの機能両方ができる
    const handleOudFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            /*const text = event.target?.result as string;
            const rows = text
                .trim()
                .split('\n')
                .map(row => row.split(','));
            onCsvDataLoaded(rows);*/
            //ここから上は表の表示、下はダイヤデータ取り込み
            const content = event.target?.result;
            const parsedData = parseOud(content, file);
            onCsvDataLoaded(parsedData.rows);
            onOudDataLoaded(parsedData);
        };
        reader.readAsText(file, "shift-jis");
    };
    const addStation = (countStation: number, stations: Station[], name: string, layout: string, main: string) => {
        //駅を追加するメソッド
        //this.stations.push(new Station(name, main, layout));
        //var newStation=new Station(name, main, layout);
        stations.push({ id: countStation, name: name, layout: layout, main: main, railnumber: [], OuterTerminal: [] })
        //this.stations.push({name,main,layout});
    };
    //addStationの中に入れたい
    const addRailNumber = (td: number, countRailNumber: number, stations: Station[], name: string, ryakushou: string) => {
        stations[td].railnumber.push({ id: countRailNumber, name: name, ryakushou: ryakushou })
    };
    const addOuterTerminal = (id: number, OuterStationID: number, stations: Station[], name: string, jikoku: string, diaryaku: string) => {
        stations[id].OuterTerminal.push({ id: OuterStationID, name: name, jikoku: jikoku, diaryaku: diaryaku });
    }
    const addTrainType = (count: number, TrainType: TrainType[], name: string, Ryakushou: string, color: string) => {
        //TrainType.push([name, Ryakushou])
        TrainType.push({ id: count, name: name, ryakushou: Ryakushou, color: color })
    };
    //路線外発着や入出区の処理をまとめて行いたい、実装途中
    /*const addOuterData = (line_word: string) => {
        const pattern = new RegExp('/^Operation(\d)([AB])=(.*)$');
        const match1 = line_word.match(pattern);
        if (match1) {
            var station_id: number = Number(match1[1] || -1);
            var AorB = match1[2];
            var word = match1[3];
        }
    }*/
    const addTrainData = (td: number, DiaId: number, lines: Array<string>, count: number, KudariData: any, NoboriData: any) => {
        //console.log("td=" + td)
        var _dir
        var _Type = ""
        var _number = ""
        var _name = ""
        var _time = []
        var _OuterTerminal = [];
        var _OuterArrive = [];
        for (var _td = td; _td < td + 10; _td++) {
            if (lines[_td] == '.') {
                break;
            }

            if (lines[_td].startsWith('Houkou=Kudari')) _dir = 0
            else if (lines[_td].startsWith('Houkou=Nobori')) _dir = 1
            if (lines[_td].startsWith('Syubetsu=')) _Type = getDataFromFile(lines[_td])
            if (lines[_td].startsWith('Ressyabangou=')) _number = getDataFromFile(lines[_td])
            if (lines[_td].startsWith('EkiJikoku=')) _time = getDataFromFile(lines[_td])
            if (lines[_td].startsWith('Ressyamei=')) _name = getDataFromFile(lines[_td])
            if (lines[_td].startsWith('Operation') && lines[_td].includes('=4')) {
                var word = lines[_td].split('=');
                var Outer = word[1].split('/');
                var _pointStationID: string = word[0].replace('Operation', '').slice(0, -1);
                var terminal: string = Outer[1];
                var _pointTime: string = Outer[2].replace('$', '');
                var _terminalStationID: string = terminal.split('$')[0];
                var _terminalTime = terminal.split('$')[1];
                if (lines[_td].includes('B=4')) {
                    _OuterTerminal.push({ pointStationID: _pointStationID, terminalStationID: _terminalStationID, terminalTime: _terminalTime, pointTime: _pointTime })
                } else if (lines[_td].includes('A=4')) {
                    _OuterArrive.push({ pointStationID: _pointStationID, terminalStationID: _terminalStationID, terminalTime: _pointTime, pointTime: _terminalTime })
                }
                continue;
                //addOuterData(lines[_td]);
            }
            //lines.splice(_td, 1);
        }
        _time = timeToEnter(_time)
        if (_dir == 0) {
            KudariData.push({ DiaLine: DiaId, id: count, dir: _dir, type: _Type, number: _number, name: _name, time: _time, outerdep: _OuterTerminal, outerarrive: _OuterArrive })
        } else if (_dir == 1) {
            NoboriData.push({ DiaLine: DiaId, id: count, dir: _dir, type: _Type, number: _number, name: _name, time: _time, outerdep: _OuterTerminal, outerarrive: _OuterArrive })
        }
    };
    const addDiagram = (Diagram: Diagrams[], count: number, countDianame: string) => {
        Diagram.push({ id: count, name: countDianame });
    }
    //発着時刻追加のif文の中、全駅の時刻を分割する。
    const timeToEnter = (time: any) => {
        const pattern1 = /(\d);(\d+)\/(\d+)/
        const pattern2 = /(\d);(\d+)/
        let matches = "";
        //console.log(time);
        if (!time.includes(',')) {
            return "00";
        }
        const Ltime = time.split(',')
        for (var s = 0; s < Ltime.length; s++) {
            let RailNumber: number;
            if (FileFormat == 2) {
                const RailNumberDevide = Ltime[s].split('$');
                Ltime[s] = RailNumberDevide[0];
                RailNumber = Number(RailNumberDevide[1]);
            } else {
                RailNumber = 1;
            }
            if (Ltime[s].length == 0) {
                Ltime[s] = { stop: 0 }
            } else if (Ltime[s].length == 1) {
                Ltime[s] = { stop: Ltime[s] }
            } else if (Ltime[s].endsWith('/')) {
                //終着駅に発車時刻を入れない
                //console.log(Ltime[s])
                matches = Ltime[s].match(pattern2)
                Ltime[s] = { stop: matches[1], arrive: Time.fromString(matches[2]), railNumberID: RailNumber }
            } else if (Ltime[s].includes('/') && !Ltime[s].includes('$')) {
                matches = Ltime[s].match(pattern1)
                Ltime[s] = { stop: matches[1], arrive: Time.fromString(matches[2]), departure: Time.fromString(matches[3]), railNumberID: RailNumber }
            } else {
                matches = Ltime[s].match(pattern2)
                //console.log(Ltime[s])
                Ltime[s] = { stop: matches[1], arrive: "", departure: Time.fromString(matches[2]), railNumberID: RailNumber }
            }
        }
        //return time.replaceAll(',', '\n')
        //time=time.replaceAll(',', '\n')
        return Ltime;
    };
    const getDataFromFile = (str: any) => {
        return str.substr(str.indexOf('=') + 1);
    }
    const getDataByKeyWord = (keyWord: string, str: any) => {
        if (str.startsWith(keyWord)) {
            return str.substr(str.indexOf('=') + 1);
        }
        return "";
    }
    //時刻データを処理したい
    /*const parseTrainData=(content:any)=> {
        const lines = content.split("\n").map(line:Array<string> => line.trim());
        const headers = lines[0].split(",");
        const rows = lines.slice(1).map(line => line.split(","));
        return { headers, rows };
    };*/
    //データを処理
    const parseOud = (content: any, file: File): OudData => {
        const lines = content.split("\n").map((line: any) => line.trim());
        console.log(lines.length);
        //ここにいったんデータを定義する(要修正)
        const stations: Station[] = [];
        const TrainType: TrainType[] = [];
        const KudariData: TrainData[] = [];
        const NoboriData: TrainData[] = [];
        const Diagrams: Diagrams[] = [];
        var count = 0;
        //let TrainId:number=0;
        var countTrain = 0;
        var countStation = 0;
        let countDia: number = 0;
        //var station=new Array(1);
        //OudiaかSecondかを判定する機能が欲しい
        if (lines[0].startsWith('FileType=OuDiaSecond')) {
            FileFormat = 2;
        } else if (lines[0].startsWith('FileType=OuDia.')) {
            FileFormat = 1;
        }
        for (var td = 0; td < lines.length; td++) {
            if (lines[td].startsWith('Rosenmei')) {
                //rosenmei = lines[td].replace('Rosenmei=', '');
                var rosenmei = getDataFromFile(lines[td]);
            } else if (lines[td].startsWith('Eki.')) {
                if (FileFormat == 1) {
                    addStation(countStation, stations, getDataFromFile(lines[td + 1]), getDataFromFile(lines[td + 2]), getDataFromFile(lines[td + 3]));
                    //lines.splice(td, 1);
                    console.log(lines[td]);
                    lines.splice(td, 4);
                } else if (FileFormat == 2) {
                    addStation(countStation, stations, getDataFromFile(lines[td + 1]), getDataFromFile(lines[td + 2]), getDataFromFile(lines[td + 3]));
                    while (lines[td + 1] != 'EkiTrack2.') {
                        if (lines[td + 1].startsWith('BrunchCoreEkiIndex')) {
                            var BrunchID: number = lines[td + 1].replace('BrunchCoreEkiIndex=', '');
                            stations[stations.length - 1].BrunchFromStationID = BrunchID;
                        }
                        td++;
                    }
                    let railNumber: number = 0;
                    let OuterStationID: number = 0;
                    while (lines[td + 1] == 'EkiTrack2.') {
                        //console.log(lines[td+2]);
                        addRailNumber(countStation, railNumber, stations, getDataByKeyWord('TrackName=', lines[td + 2]), getDataByKeyWord('TrackRyakusyou=', lines[td + 3]));
                        /*if(getDataByKeyWord('TrackName=',lines[td+2])==''||getDataByKeyWord('TrackRyakusyou=',lines[td + 3])==''){
                            break;
                        }*/
                        railNumber++;
                        //lines.splice(td, 4);
                        td += 4;
                    }
                    td++;
                    //ここに駅の路線外発着駅を追加する
                    while (lines[td + 1] == 'OuterTerminal.') {
                        addOuterTerminal(countStation, OuterStationID, stations, getDataFromFile(lines[td + 1]), getDataFromFile(lines[td + 2]), getDataFromFile(lines[td + 3]));
                        td += 5;
                        OuterStationID++;
                    }
                }
                countStation++;
                //var station=new Station(lines[td+1], lines[td+2], lines[td+3]);
            } else if (lines[td].startsWith('Ressyasyubetsu.')) {
                addTrainType(count, TrainType, getDataFromFile(lines[td + 1]), getDataFromFile(lines[td + 2]), "#" + getDataFromFile(lines[td + 3]));
                count++;
                if (file.name.endsWith('.oud')) {
                    lines.splice(td + 1, 8);
                }
            } else if (lines[td].startsWith('Ressya.')) {
                addTrainData(td, countDia, lines, countTrain, KudariData, NoboriData)
                countTrain++;

            }
            if (lines[td].startsWith('Dia.')) {
                var AddDiagramName = lines[td + 1].replace('DiaName=', '');
                addDiagram(Diagrams, countDia, AddDiagramName);
                countDia++;
                countTrain = 0;
            }
        }
        const headers = lines[0].split(",");
        const rows = lines.slice(1).map((line: any) => line.split(","));
        //console.log(rows);
        console.log(Diagrams);
        return { headers, rows, rosenmei, stations, TrainType, KudariData, NoboriData, Diagrams };
    }
    return (
        <div>
            <input type="file" onChange={handleOudFileUpload} accept=".oud,.oud2" />
        </div>

    )
}
export default DiaUploader