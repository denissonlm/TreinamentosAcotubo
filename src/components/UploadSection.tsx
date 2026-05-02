import React, { useState } from 'react';
import { UploadCloud, CheckCircle } from 'lucide-react';
import { parseDataExcel, parseTrainingExcel } from '../utils/excelParser';
import { calculateStatus } from '../utils/statusLogic';
import type { EmployeeStatus } from '../types';

interface UploadSectionProps {
  onDataProcessed: (data: EmployeeStatus[]) => void;
}

export const UploadSection: React.FC<UploadSectionProps> = ({ onDataProcessed }) => {
  const [dataFile, setDataFile] = useState<File | null>(null);
  const [trainingFile, setTrainingFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async () => {
    if (!dataFile || !trainingFile) {
      setError('Por favor, selecione ambos os arquivos.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const employees = await parseDataExcel(dataFile);
      const trainingsMap = await parseTrainingExcel(trainingFile);

      const processedData: EmployeeStatus[] = employees.map(emp => {
        // Find training data by RE
        const trainings = trainingsMap.get(emp.re) || {
          re: emp.re,
          craneTrainingDate: null,
          forkliftTrainingDate: null,
          heightTrainingDate: null,
        };

        return calculateStatus(emp, trainings);
      }).filter(status => status.isEligible);

      onDataProcessed(processedData);
    } catch (err) {
      console.error(err);
      setError('Erro ao processar planilhas. Verifique o formato.');
    } finally {
      setLoading(false);
    }
  };

  const FileDropZone = ({ 
    label, 
    file, 
    setFile 
  }: { 
    label: string, 
    file: File | null, 
    setFile: (f: File) => void 
  }) => {
    return (
      <div 
        className="glass-panel"
        style={{
          border: file ? '1px solid var(--secondary)' : '1px dashed var(--text-muted)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.3s ease'
        }}
      >
        <input 
          type="file" 
          accept=".xlsx, .xls"
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0,
            cursor: 'pointer',
            width: '100%'
          }}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              setFile(e.target.files[0]);
            }
          }}
        />
        {file ? (
          <>
            <CheckCircle color="var(--secondary)" size={48} />
            <p style={{ marginTop: '16px', fontWeight: 'bold', color: 'var(--secondary)' }}>{file.name}</p>
          </>
        ) : (
          <>
            <UploadCloud color="var(--primary)" size={48} />
            <p style={{ marginTop: '16px', fontWeight: 'bold' }}>{label}</p>
            <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>Arraste ou clique para selecionar</p>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', paddingTop: '10vh' }}>
      <h1 style={{ marginBottom: '16px', fontSize: '32px', fontWeight: '800' }}>Controle de Treinamentos</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '40px' }}>
        Faça o upload da relação de funcionários e do controle manual para gerar o dashboard.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        <FileDropZone label="1. Planilha de Funcionários (data.xlsx)" file={dataFile} setFile={setDataFile} />
        <FileDropZone label="2. Controle de Treinamentos (.xlsx)" file={trainingFile} setFile={setTrainingFile} />
      </div>

      {error && (
        <div style={{ color: 'var(--danger)', marginBottom: '24px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
          {error}
        </div>
      )}

      <button 
        className="btn btn-primary" 
        onClick={handleProcess}
        disabled={loading || !dataFile || !trainingFile}
        style={{ padding: '16px 40px', fontSize: '16px', opacity: (loading || !dataFile || !trainingFile) ? 0.5 : 1 }}
      >
        {loading ? 'Processando...' : 'Gerar Dashboard'}
      </button>
    </div>
  );
};
