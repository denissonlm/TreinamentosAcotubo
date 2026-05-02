const XLSX = require('xlsx');
const { differenceInYears } = require('date-fns');

const cleanKey = (key) => key.trim().replace(/\s+/g, ' ').toUpperCase();
const parseRE = (val) => {
  if (val instanceof Date) {
    const serial = Math.round((val.getTime() - Date.UTC(1899, 11, 30)) / (24 * 60 * 60 * 1000));
    return String(serial);
  }
  return String(val || '').trim();
};

const parseExcelDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(Date.UTC(0, 0, value - 1));
  if (typeof value === 'string') {
    const parts = value.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) return new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
      return new Date(parseInt(parts[2]), parseInt(parts[1])-1, parseInt(parts[0]));
    }
  }
  return null;
};

const wb1 = XLSX.readFile('data.xlsx');
const raw1 = XLSX.utils.sheet_to_json(wb1.Sheets[wb1.SheetNames[0]], { defval: null });
const employees = raw1.map(row => {
  const cleanRow = {};
  Object.keys(row).forEach(k => cleanRow[cleanKey(k)] = row[k]);
  return {
    re: parseRE(cleanRow['RE']),
    name: String(cleanRow['NOME'] || ''),
    role: String(cleanRow['CARGO'] || ''),
    unit: String(cleanRow['UNIDADE'] || ''),
    manager: String(cleanRow['SUPERIOR'] || ''),
  };
}).filter(e => e.re);

const wb2 = XLSX.readFile('Controle de Treinamentos.xlsx', { cellDates: true });
const raw2 = XLSX.utils.sheet_to_json(wb2.Sheets[wb2.SheetNames[0]], { defval: null });
const trainingsMap = new Map();
raw2.forEach(row => {
  const cleanRow = {};
  Object.keys(row).forEach(k => cleanRow[cleanKey(k)] = row[k]);
  const re = parseRE(cleanRow['RE']);
  if (!re) return;
  let craneDate = null, forkliftDate = null, heightDate = null;
  Object.keys(cleanRow).forEach(k => {
    if (k.includes('PONTE ROLANTE') && !k.includes('VALIDADE')) craneDate = parseExcelDate(cleanRow[k]);
    if (k.includes('EMPILHADEIRA') && !k.includes('VALIDADE')) forkliftDate = parseExcelDate(cleanRow[k]);
    if (k.includes('NR 35') && !k.includes('VALIDADE') && !k.includes('TRABALHO EM ALTURA')) heightDate = parseExcelDate(cleanRow[k]);
    else if (k.includes('TRABALHO EM ALTURA') && !k.includes('VALIDADE')) heightDate = parseExcelDate(cleanRow[k]);
  });
  trainingsMap.set(re, { craneTrainingDate: craneDate, forkliftTrainingDate: forkliftDate, heightTrainingDate: heightDate });
});

const isMandatoryCrane = (role) => role.includes('OPERADOR DE PONTE ROLANTE') || role.includes('OPERADOR DE MOVIMENTACAO E ARMAZENAGEM');
const isMandatoryForklift = (role) => role.includes('OPERADOR DE EMPILHADEIRA');
const isMandatoryHeight = (role) => role.includes('OPERADOR DE PONTE ROLANTE') || role.includes('OPERADOR DE MOVIMENTACAO E ARMAZENAGEM');

const checkStatus = (date, isMandatory) => {
  if (!date) return isMandatory ? 'IRREGULAR' : 'NAO_APLICAVEL';
  if (differenceInYears(new Date(), date) >= 2) return 'IRREGULAR';
  return 'REGULAR';
};

const normalizeRole = (role) => role.trim().toUpperCase().replace('Ç', 'C').replace('Ã', 'A').replace('Õ', 'O').replace('Á', 'A').replace('É', 'E').replace('Í', 'I').replace('Ó', 'O').replace('Ú', 'U');

let regulars = 0, irregulars = 0, noManager = 0, noUnit = 0;
const statuses = [];

employees.forEach(emp => {
  const t = trainingsMap.get(emp.re) || { craneTrainingDate: null, forkliftTrainingDate: null, heightTrainingDate: null };
  const role = normalizeRole(emp.role);
  const craneM = isMandatoryCrane(role);
  const forkM = isMandatoryForklift(role);
  const heightM = isMandatoryHeight(role);
  
  const cS = checkStatus(t.craneTrainingDate, craneM);
  const fS = checkStatus(t.forkliftTrainingDate, forkM);
  const hS = checkStatus(t.heightTrainingDate, heightM);
  
  const isEligible = craneM || forkM || heightM || t.craneTrainingDate || t.forkliftTrainingDate || t.heightTrainingDate;
  if (!isEligible) return;
  
  const overall = (cS === 'IRREGULAR' || fS === 'IRREGULAR' || hS === 'IRREGULAR') ? 'IRREGULAR' : 'REGULAR';
  if (overall === 'REGULAR') regulars++;
  else irregulars++;
  
  if (!emp.manager || emp.manager === 'undefined') noManager++;
  if (!emp.unit || emp.unit === 'undefined') noUnit++;
  
  statuses.push({ name: emp.name, role, overall, craneDate: t.craneTrainingDate, heightDate: t.heightTrainingDate });
});

console.log(`Eligible: ${statuses.length}`);
console.log(`Regulars: ${regulars}, Irregulars: ${irregulars}`);
console.log(`No Manager: ${noManager}, No Unit: ${noUnit}`);
console.log("Sample Irregulars:");
console.log(statuses.filter(s => s.overall === 'IRREGULAR').slice(0, 3));
console.log("Sample Regulars:");
console.log(statuses.filter(s => s.overall === 'REGULAR').slice(0, 3));
