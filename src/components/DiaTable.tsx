interface CsvTableProps {
  /*headers: string[];*/
  rows: string[][];
  data: string[][];
}
const DiaTable: React.FC<CsvTableProps> = ({ data,rows }) => {
  //console.log(data);
  //console.log(rows);
  if (rows.length === 0) {
    return <div>No data loaded.</div>;
  }
  return (
    <table>
      <thead>
        <tr>
          {rows[0].map((header, index) => (
            <th key={index}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.slice(1).map((row, rowIndex) => (
          <tr key={rowIndex}>
            {row.map((cell, cellIndex) => (
              <td key={cellIndex}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default DiaTable;
