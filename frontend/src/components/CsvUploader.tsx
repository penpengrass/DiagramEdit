import React from 'react';

interface CsvUploaderProps {
    onDataLoaded: (data: string[][]) => void;
}

const CsvUploader: React.FC<CsvUploaderProps> = ({ onDataLoaded }) => {
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const rows = text
                .trim()
                .split('\n')
                .map(row => row.split(','));
            onDataLoaded(rows);
        };
        reader.readAsText(file,"shift-jis");
    };

    return (
        <div>
            <input type="file" accept=".oud" onChange={handleFileUpload} />
        </div>
    );
};

export default CsvUploader;
