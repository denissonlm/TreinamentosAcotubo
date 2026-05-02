import React, { useMemo } from 'react';
import type { EmployeeStatus } from '../types';
import { Printer, ArrowLeft } from 'lucide-react';
import { format, addYears, differenceInMonths, differenceInDays } from 'date-fns';

interface ReportViewProps {
  data: EmployeeStatus[];
  onClose: () => void;
}

export const ReportView: React.FC<ReportViewProps> = ({ data, onClose }) => {
  const irregularData = useMemo(() => data.filter(d => d.overallStatus === 'IRREGULAR'), [data]);

  const groupedData = useMemo(() => {
    const map = new Map<string, Map<string, EmployeeStatus[]>>();
    
    irregularData.forEach(d => {
      const unit = d.employee.unit || 'Sem Unidade';
      const manager = d.employee.manager || 'Sem Supervisor';
      
      if (!map.has(unit)) {
        map.set(unit, new Map());
      }
      const unitMap = map.get(unit)!;
      if (!unitMap.has(manager)) {
        unitMap.set(manager, []);
      }
      unitMap.get(manager)!.push(d);
    });
    
    return map;
  }, [irregularData]);

  const formatExpirationDetails = (date: Date | null) => {
    if (!date) return <span style={{ color: '#ef4444' }}>Pendente (Nunca realizado)</span>;
    
    const expDate = addYears(date, 2);
    const months = differenceInMonths(new Date(), expDate);
    const days = differenceInDays(new Date(), expDate);
    
    let durationText = '';
    if (months > 0) {
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;
      if (years > 0) {
        durationText = `há ${years} ano${years > 1 ? 's' : ''}`;
        if (remainingMonths > 0) durationText += ` e ${remainingMonths} mê${remainingMonths > 1 ? 's' : 's'}`; // plural of mês is meses, handling below
      } else {
        durationText = `há ${months} mes${months > 1 ? 'es' : ''}`;
      }
      if (years > 0 && remainingMonths > 0) {
        durationText = `há ${years} ano${years > 1 ? 's' : ''} e ${remainingMonths} mes${remainingMonths > 1 ? 'es' : ''}`;
      }
    } else {
      durationText = `há ${days} dia${days !== 1 ? 's' : ''}`;
    }
    
    return (
      <span>
        <span style={{ color: '#ef4444' }}>Vencido em {format(expDate, 'dd/MM/yyyy')}</span> <span style={{ fontSize: '12px', color: '#64748b' }}>({durationText})</span>
      </span>
    );
  };

  const renderIrregularTrainings = (status: EmployeeStatus) => {
    const missing = [];
    if (status.craneStatus === 'IRREGULAR') {
      missing.push(
        <div key="crane" style={{ marginBottom: '4px' }}>
          <strong>Ponte Rolante:</strong> {formatExpirationDetails(status.trainings.craneTrainingDate)}
        </div>
      );
    }
    if (status.forkliftStatus === 'IRREGULAR') {
      missing.push(
        <div key="forklift" style={{ marginBottom: '4px' }}>
          <strong>Empilhadeira:</strong> {formatExpirationDetails(status.trainings.forkliftTrainingDate)}
        </div>
      );
    }
    if (status.heightStatus === 'IRREGULAR') {
      missing.push(
        <div key="height" style={{ marginBottom: '4px' }}>
          <strong>Trab. em Altura:</strong> {formatExpirationDetails(status.trainings.heightTrainingDate)}
        </div>
      );
    }
    return <div style={{ display: 'flex', flexDirection: 'column' }}>{missing}</div>;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="report-container" style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto', background: 'white', color: 'black', minHeight: '100vh' }}>
      
      {/* Controls (hidden on print) */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
        <button className="btn" onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', color: '#334155', padding: '10px 20px', border: '1px solid #cbd5e1' }}>
          <ArrowLeft size={18} />
          Voltar ao Dashboard
        </button>
        <button className="btn btn-primary" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}>
          <Printer size={18} />
          Imprimir Relatório (PDF)
        </button>
      </div>

      {/* Report Header (Cover Page) */}
      <div className="cover-page" style={{ textAlign: 'center', marginBottom: '48px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#1e293b', marginBottom: '16px' }}>Relatório de Conformidade de Treinamentos</h1>
        <p style={{ color: '#64748b', fontSize: '20px', marginBottom: '32px' }}>Grupo Açotubo</p>
        
        <div style={{ padding: '24px', background: '#f8fafc', borderRadius: '12px', display: 'inline-block', border: '1px solid #e2e8f0' }}>
          <p style={{ color: '#334155', fontSize: '18px', marginBottom: '12px' }}>Gerado em: <strong>{format(new Date(), 'dd/MM/yyyy HH:mm')}</strong></p>
          <p style={{ color: '#ef4444', fontSize: '18px' }}>Total de Funcionários Irregulares: <strong>{irregularData.length}</strong></p>
        </div>
      </div>

      {/* Report Content */}
      <div className="report-content">
        {Array.from(groupedData.entries()).sort().map(([unit, managers]) => (
          <div key={unit} style={{ marginBottom: '40px', pageBreakInside: 'avoid' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 'bold', borderBottom: '2px solid #cbd5e1', paddingBottom: '8px', marginBottom: '24px', color: '#0f172a' }}>
              Unidade: {unit}
            </h2>
            
            {Array.from(managers.entries()).sort().map(([manager, employees]) => (
              <div key={manager} style={{ marginBottom: '32px', paddingLeft: '16px', borderLeft: '4px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#334155', marginBottom: '16px' }}>
                  Supervisor: {manager} <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 'normal' }}>({employees.length} funcionário{employees.length > 1 ? 's' : ''})</span>
                </h3>
                
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', color: '#1e293b' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                      <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: '600' }}>RE</th>
                      <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: '600' }}>Nome</th>
                      <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: '600' }}>Cargo</th>
                      <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: '600' }}>Treinamentos Pendentes/Vencidos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => (
                      <tr key={emp.employee.re} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px 8px' }}>{emp.employee.re}</td>
                        <td style={{ padding: '10px 8px', fontWeight: '500' }}>{emp.employee.name}</td>
                        <td style={{ padding: '10px 8px', color: '#475569' }}>{emp.employee.role}</td>
                        <td style={{ padding: '10px 8px', color: '#1e293b' }}>{renderIrregularTrainings(emp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ))}
        {irregularData.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            Não há registros de funcionários irregulares. Excelente trabalho!
          </div>
        )}
      </div>
    </div>
  );
};
