import React from "react";
export let FileFormat: number = 0; // ここでグローバルに定義
interface RailNumber {
    id: number;
    name: string;
    ryakushou: string;
}
interface Station {
    id: number;
    name: string;
    main: string;
    layout: string;
    railnumber: RailNumber[];
}

interface TrainType {
    id: number;
    name: string;
    ryakushou: string;
    color: string;
}

interface TrainData {
    id: number;
    dir: number;
    type: string;
    number: string;
    name: string;
    time: TimeEntry[];
}

interface TimeEntry {
    stop: number | string;
    arrive?: string;
    departure?: string;
    railnumber?: number;
}

interface OudData {
    headers: string[];
    rows: string[][];
    rosenmei: string;
    stations: Station[];
    TrainType: TrainType[];
    KudariData: TrainData[];
    NoboriData: TrainData[];
}
interface DiaUploaderProps {
    onOudDataLoaded: (data: any) => void;
    onCsvDataLoaded: (rows: any) => void;
}
const DiaUploader: React.FC<DiaUploaderProps> = ({ onOudDataLoaded, onCsvDataLoaded }) => {
    //const DiaUploader=({onOudDataLoaded, rosenmei }) => {
    //こちらでoudファイルの中身表示ができる
    // const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    //         const file = e.target.files?.[0];
    //         if (!file) return;

    //         const reader = new FileReader();
    //         reader.onload = (event) => {
    //             const text = event.target?.result as string;
    //             const rows = text
    //                 .trim()
    //                 .split('\n')
    //                 .map(row => row.split(','));
    //             onOudDataLoaded(rows);
    //         };
    //         reader.readAsText(file,"shift-jis");
    //     };
    //こちらではoudファイルの中身表示ができないが、dataにオブジェクトを入れられる
    // const handleOudFileUpload2 = (event: React.ChangeEvent<HTMLInputElement>) => {
    //     const file = event.target.files?.[0];
    //     if (!file) return;
    //     console.log("handleOudFileUpload");
    //     const reader = new FileReader();
    //     reader.onload = (e) => {
    //         const content = e.target?.result;
    //         const parsedData = parseOud(content, file);
    //         onOudDataLoaded(parsedData);
    //     };
    //     reader.readAsText(file, "shift-jis");
    // };
    //上記2つの機能両方ができる
    const handleOudFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const rows = text
                .trim()
                .split('\n')
                .map(row => row.split(','));
            onCsvDataLoaded(rows);
            //ここから上は表の表示、下はダイヤデータ取り込み
            const content = event.target?.result;
            const parsedData = parseOud(content, file);
            onOudDataLoaded(parsedData);
        };
        reader.readAsText(file, "shift-jis");
    };
    const addStation = (countStation: number, stations: any, name: string, layout: string, main: string) => {
        //駅を追加するメソッド
        //this.stations.push(new Station(name, main, layout));
        //var newStation=new Station(name, main, layout);
        stations.push({ id: countStation, name: name, layout: layout, main: main ,railnumber:[]})
        //this.stations.push({name,main,layout});
    };
    //addStationの中に入れたい
    const addRailNumber = (td: number, countRailNumber: number, stations: any, name: string, ryakushou: string) => {
        console.log(stations[td]);
        stations[td].railnumber.push({ id: countRailNumber, name: name, ryakushou: ryakushou })
    };
    const addTrainType = (count: number, TrainType: any, name: string, Ryakushou: string, color: string) => {
        //TrainType.push([name, Ryakushou])
        TrainType.push({ id: count, name: name, ryakushou: Ryakushou, color: color })
    };
    const addTrainData = (td: number, lines: Array<string>, count: number, KudariData: any, NoboriData: any) => {
        //console.log("td=" + td)
        var _dir
        var _Type = ""
        var _number = ""
        var _name = ""
        var _time = []
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
            //lines.splice(_td, 1);
        }
        _time = timeToEnter(_time)
        if (_dir == 0) {
            KudariData.push({ id: count, dir: _dir, type: _Type, number: _number, name: _name, time: _time })
        } else if (_dir == 1) {
            NoboriData.push({ id: count, dir: _dir, type: _Type, number: _number, name: _name, time: _time })
        }
    };
    //発着時刻追加のif文の中
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
            //下10行ほどはoud2の退避用
            if (Ltime[s].startsWith('2$')) {
                Ltime[s] = '2';
            }
            Ltime[s] = Ltime[s].replace('/$0', '')
            Ltime[s] = Ltime[s].replace('$0', '')
            Ltime[s] = Ltime[s].replace('/$1', '')
            Ltime[s] = Ltime[s].replace('$1', '')
            Ltime[s] = Ltime[s].replace('/$2', '')
            Ltime[s] = Ltime[s].replace('$2', '')
            //Ltime[s] = Ltime[s].replace('/$3', '')
            //Ltime[s] = Ltime[s].replace('$3', '')
            if (Ltime[s].length == 0) {
                Ltime[s] = { stop: 0 }
            } else if (Ltime[s].length == 1) {
                Ltime[s] = { stop: Ltime[s] }
            } else if (Ltime[s].endsWith('/')) {
                //終着のみ(発時刻に着時刻を入れている)
                //console.log(Ltime[s])
                matches = Ltime[s].match(pattern2)
                Ltime[s] = { stop: matches[1], arrive: matches[2], departure: matches[2] }
            } else if (Ltime[s].includes('/') && !Ltime[s].includes('$')) {
                matches = Ltime[s].match(pattern1)
                Ltime[s] = { stop: matches[1], arrive: matches[2], departure: matches[3] }
            } else {
                matches = Ltime[s].match(pattern2)
                //console.log(Ltime[s])
                Ltime[s] = { stop: matches[1], arrive: "", departure: matches[2] }
            }
        }
        //return time.replaceAll(',', '\n')
        //time=time.replaceAll(',', '\n')
        return Ltime;
    };
    const getDataFromFile = (str: any) => {
        return str.substr(str.indexOf('=') + 1);
    }
    const getDataByKeyWord=(keyWord:string,str:any)=>{
        if(str.startsWith(keyWord)){
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
        var count = 0;
        var countTrain = 0;
        var countStation = 0;
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
                    //(要変更)路線外発着を考慮していないため後に変更する
                    while(lines[td+1]!='EkiTrack2.'){
                        td++;
                    }
                    let railNumber:number=0;
                    while (lines[td+1]=='EkiTrack2.') {
                        //console.log(lines[td+2]);
                        addRailNumber(countStation, railNumber, stations, getDataByKeyWord('TrackName=',lines[td+2]), getDataByKeyWord('TrackRyakusyou=',lines[td + 3]));
                        /*if(getDataByKeyWord('TrackName=',lines[td+2])==''||getDataByKeyWord('TrackRyakusyou=',lines[td + 3])==''){
                            break;
                        }*/
                        railNumber++;
                        //lines.splice(td, 1);
                        td+=4;
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
                addTrainData(td, lines, countTrain, KudariData, NoboriData)
                countTrain++;
            }
        }
        const headers = lines[0].split(",");
        const rows = lines.slice(1).map((line: any) => line.split(","));
        console.log(KudariData[0].time[3].arrive);
        //console.log(lines);
        return { headers, rows, rosenmei, stations, TrainType, KudariData, NoboriData };
    }
    return (
        <div>
            <input type="file" onChange={handleOudFileUpload} accept=".oud,.oud2" />
        </div>

    )
}
export default DiaUploader