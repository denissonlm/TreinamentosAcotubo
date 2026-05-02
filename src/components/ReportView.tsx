import React, { useMemo } from 'react';
import type { EmployeeStatus } from '../types';
import { Printer, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

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

  const getIrregularTrainings = (status: EmployeeStatus) => {
    const missing = [];
    if (status.craneStatus === 'IRREGULAR') missing.push('Ponte Rolante');
    if (status.forkliftStatus === 'IRREGULAR') missing.push('Empilhadeira');
    if (status.heightStatus === 'IRREGULAR') missing.push('Trab. em Altura');
    return missing.join(', ');
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

      {/* Report Header */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>Relatório de Irregularidades de Treinamento</h1>
        <p style={{ color: '#64748b', fontSize: '16px' }}>Grupo Açotubo • Gerado em {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
        <p style={{ color: '#ef4444', fontWeight: 'bold', marginTop: '8px' }}>Total de Funcionários Irregulares: {irregularData.length}</p>
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
                        <td style={{ padding: '10px 8px', color: '#ef4444', fontWeight: '500' }}>{getIrregularTrainings(emp)}</td>
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
