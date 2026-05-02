const XLSX = require('xlsx');

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
      if (parts[0].length === 4) { // yyyy-mm-dd
         return new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
      }
      return new Date(parseInt(parts[2]), parseInt(parts[1])-1, parseInt(parts[0]));
    }
  }
  return null;
};

// data.xlsx
const wb1 = XLSX.readFile('data.xlsx');
const ws1 = wb1.Sheets[wb1.SheetNames[0]];
const raw1 = XLSX.utils.sheet_to_json(ws1, { defval: null });

console.log("=== data.xlsx (first 2) ===");
const cleanData1 = {};
Object.keys(raw1[0]).forEach(k => cleanData1[cleanKey(k)] = raw1[0][k]);
console.log("Raw keys:", Object.keys(raw1[0]));
console.log("Clean keys:", Object.keys(cleanData1));
console.log("Parsed RE:", parseRE(cleanData1['RE']), "Parsed Superior:", String(cleanData1['SUPERIOR'] || ''), "Parsed Unit:", String(cleanData1['UNIDADE'] || ''));

// Controle de Treinamentos.xlsx
const wb2 = XLSX.readFile('Controle de Treinamentos.xlsx', { cellDates: true });
const ws2 = wb2.Sheets[wb2.SheetNames[0]];
const raw2 = XLSX.utils.sheet_to_json(ws2, { defval: null });

console.log("\n=== Controle de Treinamentos.xlsx (first 2) ===");
const cleanData2 = {};
Object.keys(raw2[0]).forEach(k => cleanData2[cleanKey(k)] = raw2[0][k]);
console.log("Raw keys:", Object.keys(raw2[0]));
console.log("Clean keys:", Object.keys(cleanData2));
console.log("Parsed RE:", parseRE(cleanData2['RE']));

let craneDate = null, forkliftDate = null, heightDate = null;
Object.keys(cleanData2).forEach(k => {
  if (k.includes('PONTE ROLANTE') && !k.includes('VALIDADE')) craneDate = parseExcelDate(cleanData2[k]);
  if (k.includes('EMPILHADEIRA') && !k.includes('VALIDADE')) forkliftDate = parseExcelDate(cleanData2[k]);
  if (k.includes('NR 35') && !k.includes('VALIDADE') && !k.includes('TRABALHO EM ALTURA')) heightDate = parseExcelDate(cleanData2[k]);
  else if (k.includes('TRABALHO EM ALTURA') && !k.includes('VALIDADE')) heightDate = parseExcelDate(cleanData2[k]);
});
console.log("Crane Date:", craneDate, "Raw:", Object.keys(cleanData2).find(k => k.includes('PONTE ROLANTE') && !k.includes('VALIDADE')), cleanData2[Object.keys(cleanData2).find(k => k.includes('PONTE ROLANTE') && !k.includes('VALIDADE'))]);
console.log("Forklift Date:", forkliftDate);
console.log("Height Date:", heightDate, "Raw:", Object.keys(cleanData2).find(k => k.includes('NR 35') || k.includes('ALTURA')), cleanData2[Object.keys(cleanData2).find(k => k.includes('NR 35') || k.includes('ALTURA'))]);

