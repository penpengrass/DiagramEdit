import React from "react";
export const FileFormat: number = 0; // ここでグローバルに定義
import { parseOud as parseSharedOud } from '../../../shared/parsers/oudParser';

interface DiaUploaderProps {
    onOudDataLoaded: (data: any) => void;
    onCsvDataLoaded: (rows: any) => void;
}

// バックエンド使用フラグ（trueでバックエンド、falseでフロント側実装を使用）
const USE_BACKEND = false;

const DiaUploader: React.FC<DiaUploaderProps> = ({ onOudDataLoaded, onCsvDataLoaded }) => {
    //2つの機能両方ができる
    const handleOudFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const content = event.target?.result as string;

            if (USE_BACKEND) {
                // バックエンド側のAPIを使用
                try {
                    const response = await fetch('http://localhost:3000/api/stations/parse-oud', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            fileContent: content,
                            fileName: file.name,
                        }),
                    });

                    if (!response.ok) {
                        throw new Error(`Server error: ${response.status}`);
                    }

                    const parsedData = await response.json();
                    onCsvDataLoaded(parsedData.rows);
                    onOudDataLoaded(parsedData);
                    console.log('OUD file parsed by backend:', parsedData);
                } catch (err) {
                    console.error('Error parsing OUD file:', err);
                    alert('OUDファイルの解析に失敗しました: ' + err);
                }
            } else {
                // フロント側実装を使用（従来通り）
                //const parsedData = parseOud(content, file);
                // 共有パーサーを使用。ローカルのparseOudは比較用に残す。
                const parsedData = parseSharedOud(content, file.name);
                onCsvDataLoaded(parsedData.rows);
                onOudDataLoaded(parsedData);
            }
        };
        reader.readAsText(file, "shift-jis");
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
    //時刻データを処理したい
    /*const parseTrainData=(content:any)=> {
        const lines = content.split("\n").map(line:Array<string> => line.trim());
        const headers = lines[0].split(",");
        const rows = lines.slice(1).map(line => line.split(","));
        return { headers, rows };
    };*/
    return (
        <div>
            <input type="file" onChange={handleOudFileUpload} accept=".oud,.oud2" />
        </div>

    )
}
export default DiaUploader