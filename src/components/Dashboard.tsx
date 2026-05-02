import React, { useState, useMemo } from 'react';
import type { EmployeeStatus } from '../types';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend
} from 'recharts';
import { Search, AlertTriangle, CheckCircle, BookOpen, Clock, Printer, X, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { ReportView } from './ReportView';

interface DashboardProps {
  data: EmployeeStatus[];
  onReset: () => void;
}

const COLORS = {
  REGULAR: '#10B981', // Green
  IRREGULAR: '#EF4444', // Red
  NA: '#94A3B8' // Gray
};

export const Dashboard: React.FC<DashboardProps> = ({ data, onReset }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterManager, setFilterManager] = useState<string>('ALL');
  const [filterUnit, setFilterUnit] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<'ALL' | 'MANDATORY' | 'EVENTUAL'>('ALL');
  const [chartView, setChartView] = useState<'cargo' | 'unidade'>('cargo');
  const [showReport, setShowReport] = useState(false);

  // Cross-filtered data used by everything
  const crossFilteredData = useMemo(() => {
    return data.filter(d => {
      const matchesSearch = 
        d.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        d.employee.re.includes(searchTerm);
      
      const matchesStatus = filterStatus === 'ALL' || d.overallStatus === filterStatus;
      const matchesManager = filterManager === 'ALL' || d.employee.manager === filterManager;
      const matchesUnit = filterUnit === 'ALL' || d.employee.unit === filterUnit;
      const matchesType = filterType === 'ALL' || 
                          (filterType === 'MANDATORY' && d.isMandatory) || 
                          (filterType === 'EVENTUAL' && d.isEventual);
      
      return matchesSearch && matchesStatus && matchesManager && matchesUnit && matchesType;
    });
  }, [data, searchTerm, filterStatus, filterManager, filterUnit, filterType]);

  const uniqueManagers = useMemo(() => Array.from(new Set(data.map(d => d.employee.manager).filter(Boolean))).sort(), [data]);
  const uniqueUnits = useMemo(() => Array.from(new Set(data.map(d => d.employee.unit).filter(Boolean))).sort(), [data]);

  // KPI calculations
  const totalMonitored = crossFilteredData.length;
  const mandatoryCount = crossFilteredData.filter(d => d.isMandatory).length;
  const eventualCount = crossFilteredData.filter(d => d.isEventual).length;
  const regularEmployees = crossFilteredData.filter(d => d.overallStatus === 'REGULAR').length;
  const irregularEmployees = crossFilteredData.filter(d => d.overallStatus === 'IRREGULAR').length;
  const regularPercentage = totalMonitored > 0 ? Math.round((regularEmployees / totalMonitored) * 100) : 0;
  const irregularPercentage = totalMonitored > 0 ? Math.round((irregularEmployees / totalMonitored) * 100) : 0;

  // Toggle handlers for cross-filtering
  const toggleFilterStatus = (status: string) => setFilterStatus(prev => prev === status ? 'ALL' : status);
  const toggleFilterType = (type: 'MANDATORY' | 'EVENTUAL') => setFilterType(prev => prev === type ? 'ALL' : type);
  const toggleFilterUnit = (unit: string) => setFilterUnit(prev => prev === unit ? 'ALL' : unit);

  const clearAllFilters = () => {
    setFilterStatus('ALL');
    setFilterType('ALL');
    setFilterUnit('ALL');
    setFilterManager('ALL');
    setSearchTerm('');
  };

  const activeFilters = useMemo(() => {
    const filters = [];
    if (filterStatus !== 'ALL') filters.push({ label: `Status: ${filterStatus}`, clear: () => setFilterStatus('ALL') });
    if (filterType !== 'ALL') filters.push({ label: `Tipo: ${filterType === 'MANDATORY' ? 'Obrigatório' : 'Eventual'}`, clear: () => setFilterType('ALL') });
    if (filterUnit !== 'ALL') filters.push({ label: `Unidade: ${filterUnit}`, clear: () => setFilterUnit('ALL') });
    if (filterManager !== 'ALL') filters.push({ label: `Supervisor: ${filterManager}`, clear: () => setFilterManager('ALL') });
    if (searchTerm !== '') filters.push({ label: `Busca: ${searchTerm}`, clear: () => setSearchTerm('') });
    return filters;
  }, [filterStatus, filterType, filterUnit, filterManager, searchTerm]);

  // Chart Data
  const pieData = [
    { name: 'REGULAR', value: regularEmployees, color: COLORS.REGULAR },
    { name: 'IRREGULAR', value: irregularEmployees, color: COLORS.IRREGULAR },
  ];

  const roleBarData = useMemo(() => {
    const roleMap = new Map<string, { role: string, regular: number, irregular: number }>();
    crossFilteredData.forEach(d => {
      // Only group roles that actually have trainings required or eventuais mapped
      // To simplify, group all roles that have at least one training or are mandatory
      const role = d.employee.role;
      if (!roleMap.has(role)) {
        roleMap.set(role, { role, regular: 0, irregular: 0 });
      }
      const entry = roleMap.get(role)!;
      if (d.overallStatus === 'REGULAR') entry.regular += 1;
      else entry.irregular += 1;
    });
    
    return Array.from(roleMap.values())
      .filter(d => d.regular > 0 || d.irregular > 0)
      .sort((a, b) => b.irregular - a.irregular)
      .slice(0, 5); // Top 5 roles with issues
  }, [crossFilteredData]);

  const unitBarData = useMemo(() => {
    const unitMap = new Map<string, { role: string, regular: number, irregular: number }>();
    crossFilteredData.forEach(d => {
      const unit = d.employee.unit;
      if (!unitMap.has(unit)) {
        unitMap.set(unit, { role: unit, regular: 0, irregular: 0 }); // Using 'role' for x-axis consistency
      }
      const entry = unitMap.get(unit)!;
      if (d.overallStatus === 'REGULAR') entry.regular += 1;
      else entry.irregular += 1;
    });
    
    return Array.from(unitMap.values())
      .filter(d => d.regular > 0 || d.irregular > 0)
      .sort((a, b) => b.irregular - a.irregular)
      .slice(0, 5); // Top 5 units with issues
  }, [crossFilteredData]);

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return format(date, 'dd/MM/yyyy');
  };

  const StatusBadge = ({ status }: { status: string }) => {
    if (status === 'REGULAR') return <span className="status-badge status-regular">Regular</span>;
    if (status === 'IRREGULAR') return <span className="status-badge status-irregular">Irregular</span>;
    return <span className="status-badge status-na">N/A</span>;
  };

  if (showReport) {
    return <ReportView data={data} onClose={() => setShowReport(false)} />;
  }

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold' }}>Dashboard de Treinamentos</h1>
          <p style={{ color: 'var(--text-muted)' }}>Visão geral do Grupo Açotubo</p>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button className="btn" style={{ background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setShowReport(true)}>
            <Printer size={18} />
            Gerar Relatório PDF
          </button>
          <button className="btn" style={{ background: 'var(--surface-border)', color: 'white' }} onClick={onReset}>
            Voltar para Upload
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <div 
          className="glass-panel" 
          onClick={() => toggleFilterType('MANDATORY')}
          style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', border: filterType === 'MANDATORY' ? '2px solid var(--primary)' : undefined, transform: filterType === 'MANDATORY' ? 'translateY(-2px)' : 'none', transition: 'all 0.2s' }}
        >
          <div style={{ padding: '16px', background: 'rgba(79, 70, 229, 0.2)', borderRadius: '12px' }}>
            <BookOpen color="var(--primary)" size={32} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Treinamento Obrigatório</p>
            <h2 style={{ fontSize: '28px', fontWeight: 'bold' }}>{mandatoryCount}</h2>
          </div>
        </div>

        <div 
          className="glass-panel" 
          onClick={() => toggleFilterType('EVENTUAL')}
          style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', border: filterType === 'EVENTUAL' ? '2px solid #F59E0B' : undefined, transform: filterType === 'EVENTUAL' ? 'translateY(-2px)' : 'none', transition: 'all 0.2s' }}
        >
          <div style={{ padding: '16px', background: 'rgba(245, 158, 11, 0.2)', borderRadius: '12px' }}>
            <Clock color="#F59E0B" size={32} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Treinamento Eventual</p>
            <h2 style={{ fontSize: '28px', fontWeight: 'bold' }}>{eventualCount}</h2>
          </div>
        </div>

        <div 
          className="glass-panel" 
          onClick={() => toggleFilterStatus('REGULAR')}
          style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', border: filterStatus === 'REGULAR' ? `2px solid ${COLORS.REGULAR}` : undefined, transform: filterStatus === 'REGULAR' ? 'translateY(-2px)' : 'none', transition: 'all 0.2s' }}
        >
          <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.2)', borderRadius: '12px' }}>
            <CheckCircle color={COLORS.REGULAR} size={32} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Status Regular</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold' }}>{regularEmployees}</h2>
              <span style={{ fontSize: '14px', color: COLORS.REGULAR }}>({regularPercentage}%)</span>
            </div>
          </div>
        </div>

        <div 
          className="glass-panel" 
          onClick={() => toggleFilterStatus('IRREGULAR')}
          style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', border: filterStatus === 'IRREGULAR' ? `2px solid ${COLORS.IRREGULAR}` : undefined, transform: filterStatus === 'IRREGULAR' ? 'translateY(-2px)' : 'none', transition: 'all 0.2s' }}
        >
          <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.2)', borderRadius: '12px' }}>
            <AlertTriangle color={COLORS.IRREGULAR} size={32} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Status Irregular</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold' }}>{irregularEmployees}</h2>
              <span style={{ fontSize: '14px', color: COLORS.IRREGULAR }}>({irregularPercentage}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', marginBottom: '32px' }}>
        <div className="glass-panel">
          <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>Distribuição Geral</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  onClick={(entry) => toggleFilterStatus(entry.name)}
                  style={{ cursor: 'pointer' }}
                >
                  {pieData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                      stroke="rgba(0,0,0,0)" 
                      opacity={filterStatus === 'ALL' || filterStatus === entry.name ? 1 : 0.3} 
                    />
                  ))}
                </Pie>
                <RechartsTooltip 
                  cursor={false}
                  contentStyle={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'white' }}
                  itemStyle={{ color: 'white' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', margin: 0 }}>Irregularidades por {chartView === 'cargo' ? 'Cargo' : 'Unidade'} (Top 5)</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setChartView('cargo')}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--surface-border)', background: chartView === 'cargo' ? 'var(--primary)' : 'rgba(0,0,0,0.2)', color: 'white', cursor: 'pointer', fontSize: '12px', transition: 'all 0.2s' }}
              >Cargo</button>
              <button 
                onClick={() => setChartView('unidade')}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--surface-border)', background: chartView === 'unidade' ? 'var(--primary)' : 'rgba(0,0,0,0.2)', color: 'white', cursor: 'pointer', fontSize: '12px', transition: 'all 0.2s' }}
              >Unidade</button>
            </div>
          </div>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={chartView === 'cargo' ? roleBarData : unitBarData} 
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                onClick={(state) => {
                  if (state && state.activePayload && state.activePayload.length > 0) {
                    if (chartView === 'unidade') toggleFilterUnit(state.activePayload[0].payload.role);
                  }
                }}
                style={{ cursor: chartView === 'unidade' ? 'pointer' : 'default' }}
              >
                <XAxis dataKey="role" stroke="var(--text-muted)" tick={{fill: 'var(--text-muted)', fontSize: 12}} axisLine={false} tickLine={false} />
                <RechartsTooltip 
                  cursor={false}
                  contentStyle={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'white' }}
                />
                <Legend />
                <Bar dataKey="regular" name="Regular" stackId="a" fill={COLORS.REGULAR} radius={[0, 0, 4, 4]} />
                <Bar dataKey="irregular" name="Irregular" stackId="a" fill={COLORS.IRREGULAR} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px' }}>Relação de Funcionários</h3>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
              <input 
                type="text" 
                placeholder="Buscar por Nome ou RE..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ 
                  padding: '10px 10px 10px 40px', 
                  borderRadius: '8px', 
                  border: '1px solid var(--surface-border)', 
                  background: 'rgba(0,0,0,0.2)', 
                  color: 'white',
                  width: '250px'
                }}
              />
            </div>
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid var(--surface-border)',
                background: 'rgba(0,0,0,0.2)',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="ALL" style={{color: 'black'}}>Todos os Status</option>
              <option value="REGULAR" style={{color: 'black'}}>Apenas Regular</option>
              <option value="IRREGULAR" style={{color: 'black'}}>Apenas Irregular</option>
            </select>
            <select 
              value={filterManager}
              onChange={(e) => setFilterManager(e.target.value)}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid var(--surface-border)',
                background: 'rgba(0,0,0,0.2)',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="ALL" style={{color: 'black'}}>Todos os Superiores</option>
              {uniqueManagers.map(m => <option key={m} value={m} style={{color: 'black'}}>{m}</option>)}
            </select>
            <select 
              value={filterUnit}
              onChange={(e) => setFilterUnit(e.target.value)}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid var(--surface-border)',
                background: 'rgba(0,0,0,0.2)',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="ALL" style={{color: 'black'}}>Todas as Unidades</option>
              {uniqueUnits.map(u => <option key={u} value={u} style={{color: 'black'}}>{u}</option>)}
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--surface-border)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px', fontWeight: '500' }}>RE</th>
                <th style={{ padding: '12px', fontWeight: '500' }}>Nome</th>
                <th style={{ padding: '12px', fontWeight: '500' }}>Cargo</th>
                <th style={{ padding: '12px', fontWeight: '500' }}>Unid./Sup.</th>
                <th style={{ padding: '12px', fontWeight: '500' }}>Ponte Rolante</th>
                <th style={{ padding: '12px', fontWeight: '500' }}>Empilhadeira</th>
                <th style={{ padding: '12px', fontWeight: '500' }}>Trab. Altura</th>
                <th style={{ padding: '12px', fontWeight: '500' }}>Status Geral</th>
              </tr>
            </thead>
            <tbody>
              {crossFilteredData.slice(0, 100).map(row => (
                <tr key={row.employee.re} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '16px 12px' }}>{row.employee.re}</td>
                  <td style={{ padding: '16px 12px', fontWeight: '500' }}>{row.employee.name}</td>
                  <td style={{ padding: '16px 12px', color: 'var(--text-muted)' }}>{row.employee.role}</td>
                  <td style={{ padding: '16px 12px', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '13px' }}>{row.employee.unit}</span>
                      <span style={{ fontSize: '11px', opacity: 0.7 }}>{row.employee.manager}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <StatusBadge status={row.craneStatus} />
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {formatDate(row.trainings.craneTrainingDate)}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <StatusBadge status={row.forkliftStatus} />
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {formatDate(row.trainings.forkliftTrainingDate)}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <StatusBadge status={row.heightStatus} />
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {formatDate(row.trainings.heightTrainingDate)}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 12px' }}>
                    <StatusBadge status={row.overallStatus} />
                  </td>
                </tr>
              ))}
              {crossFilteredData.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Nenhum registro encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {crossFilteredData.length > 100 && (
             <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
               Mostrando 100 de {crossFilteredData.length} resultados.
             </div>
          )}
        </div>
      </div>

      {/* Floating Active Filters Bar */}
      {activeFilters.length > 0 && (
        <div className="no-print" style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '99px',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
          zIndex: 1000,
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
            <Filter size={16} />
            <span style={{ fontSize: '14px', fontWeight: '500' }}>Filtros Ativos:</span>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {activeFilters.map((f, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.1)',
                padding: '4px 12px',
                borderRadius: '99px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                color: 'white'
              }}>
                {f.label}
                <button onClick={f.clear} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 0 }}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }}></div>

          <button onClick={clearAllFilters} style={{ 
            background: 'transparent', 
            border: 'none', 
            color: '#ef4444', 
            fontWeight: '600', 
            fontSize: '13px', 
            cursor: 'pointer',
            padding: '4px 8px'
          }}>
            Limpar Todos
          </button>
        </div>
      )}

    </div>
  );
};
