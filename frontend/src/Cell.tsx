// excelのような表編集のサンプル
import React, { useState } from "react";

type Cell = string;

type SpreadsheetData = Cell[][];
//10*10の空のデータを用意
const initialData: SpreadsheetData = Array.from({ length: 10 }, () =>
  Array.from({ length: 10 }, () => "")
);

export default function Spreadsheet() {
  const [data, setData] = useState<SpreadsheetData>(initialData);
  const [editing, setEditing] = useState<{ row: number; col: number } | null>(null);

  const handleChange = (value: string, row: number, col: number) => {
    const newData = [...data];
    newData[row][col] = value;
    setData(newData);
  };

  const renderCell = (cell: Cell, row: number, col: number) => {
    const isEditing = editing?.row === row && editing?.col === col;

    return (
      <td
        key={`${row}-${col}`}
        onClick={() => setEditing({ row, col })}
        style={{ border: "1px solid #ccc", padding: "4px", minWidth: "80px" }}
      >
        {isEditing ? (
          <input
            type="text"
            autoFocus
            value={cell}
            onChange={(e) => handleChange(e.target.value, row, col)}
            onBlur={() => setEditing(null)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setEditing(null);
            }}
            style={{ width: "100%" }}
          />
        ) : (
          cell
        )}
      </td>
    );
  };

  return (
    <table style={{ borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th></th>
          {data[0].map((_, colIndex) => (
            <th key={colIndex} style={{ border: "1px solid #ccc", padding: "4px" }}>
              {String.fromCharCode(65 + colIndex)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((rowData, rowIndex) => (
          <tr key={rowIndex}>
            <th style={{ border: "1px solid #ccc", padding: "4px" }}>{rowIndex + 1}</th>
            {rowData.map((cell, colIndex) => renderCell(cell, rowIndex, colIndex))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
