import * as XLSX from 'xlsx';
import type { EmployeeData, TrainingData } from '../types';

const cleanKey = (key: string) => key.trim().replace(/\s+/g, ' ').toUpperCase();

const parseRE = (val: any): string => {
  if (val instanceof Date) {
    const serial = Math.round((val.getTime() - Date.UTC(1899, 11, 30)) / (24 * 60 * 60 * 1000));
    return String(serial);
  }
  return String(val || '').trim();
};

const parseExcelDate = (value: any): Date | null => {
  if (!value) return null;
  
  if (value instanceof Date) {
    return value;
  }
  
  if (typeof value === 'number') {
    // Excel numeric date format
    const date = new Date(Date.UTC(0, 0, value - 1));
    return date;
  }
  
  if (typeof value === 'string') {
    const parts = value.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // yyyy-mm-dd
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      } else {
        // dd/mm/yyyy
        const year = parseInt(parts[2], 10);
        const fullYear = year < 100 ? 2000 + year : year;
        return new Date(fullYear, parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      }
    }
  }
  
  return null;
};

export const parseDataExcel = async (file: File): Promise<EmployeeData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });
        
        const employees: EmployeeData[] = rawJson.map(row => {
          const cleanRow: any = {};
          Object.keys(row).forEach(k => cleanRow[cleanKey(k)] = row[k]);
          
          return {
            re: parseRE(cleanRow['RE']),
            name: String(cleanRow['NOME'] || ''),
            role: String(cleanRow['CARGO'] || ''),
            area: String(cleanRow['CENTRO DE CUSTO'] || cleanRow['UNIDADE'] || ''),
            unit: String(cleanRow['UNIDADE'] || ''),
            manager: String(cleanRow['SUPERIOR'] || ''),
            status: String(cleanRow['SITUACAO'] || '')
          };
        }).filter(e => e.re);
        
        resolve(employees);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
};

export const parseTrainingExcel = async (file: File): Promise<Map<string, TrainingData>> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });
        
        const trainingsMap = new Map<string, TrainingData>();
        
        rawJson.forEach(row => {
          const cleanRow: any = {};
          Object.keys(row).forEach(k => cleanRow[cleanKey(k)] = row[k]);
          
          const re = parseRE(cleanRow['RE']);
          if (!re) return;
          
          // Header search for Crane, Forklift, Height
          let craneDate = null;
          let forkliftDate = null;
          let heightDate = null;
          
          Object.keys(cleanRow).forEach(k => {
            if (k.includes('PONTE ROLANTE') && !k.includes('VALIDADE')) {
              craneDate = parseExcelDate(cleanRow[k]);
            }
            if (k.includes('EMPILHADEIRA') && !k.includes('VALIDADE')) {
              forkliftDate = parseExcelDate(cleanRow[k]);
            }
            if (k.includes('NR 35') && !k.includes('VALIDADE') && !k.includes('TRABALHO EM ALTURA')) {
              heightDate = parseExcelDate(cleanRow[k]);
            } else if (k.includes('TRABALHO EM ALTURA') && !k.includes('VALIDADE')) {
               heightDate = parseExcelDate(cleanRow[k]);
            }
          });
          
          trainingsMap.set(re, {
            re,
            craneTrainingDate: craneDate,
            forkliftTrainingDate: forkliftDate,
            heightTrainingDate: heightDate,
          });
        });
        
        resolve(trainingsMap);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
};
