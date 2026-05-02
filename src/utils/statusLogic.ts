import { differenceInYears } from 'date-fns';
import type { EmployeeData, EmployeeStatus, TrainingData } from '../types';

export const normalizeRole = (role: string) => {
  return role.trim().toUpperCase()
    .replace('Ç', 'C')
    .replace('Ã', 'A')
    .replace('Õ', 'O')
    .replace('Á', 'A')
    .replace('É', 'E')
    .replace('Í', 'I')
    .replace('Ó', 'O')
    .replace('Ú', 'U');
};

const isMandatoryCrane = (normalizedRole: string) => {
  return normalizedRole.includes('OPERADOR DE PONTE ROLANTE') || 
         normalizedRole.includes('OPERADOR DE MOVIMENTACAO E ARMAZENAGEM');
};

const isMandatoryHeight = (normalizedRole: string) => {
  return normalizedRole.includes('OPERADOR DE PONTE ROLANTE') || 
         normalizedRole.includes('OPERADOR DE MOVIMENTACAO E ARMAZENAGEM');
};

const isMandatoryForklift = (normalizedRole: string) => {
  return normalizedRole.includes('OPERADOR DE EMPILHADEIRA');
};

const checkStatus = (date: Date | null, isMandatory: boolean): 'REGULAR' | 'IRREGULAR' | 'NAO_APLICAVEL' => {
  if (!date) {
    return isMandatory ? 'IRREGULAR' : 'NAO_APLICAVEL';
  }
  
  const yearsSinceTraining = differenceInYears(new Date(), date);
  if (yearsSinceTraining >= 2) {
    return 'IRREGULAR'; // Vencido (mais de 2 anos)
  }
  
  return 'REGULAR';
};

export const calculateStatus = (employee: EmployeeData, trainings: TrainingData): EmployeeStatus => {
  const normalizedRole = normalizeRole(employee.role);

  const craneMandatory = isMandatoryCrane(normalizedRole);
  const forkliftMandatory = isMandatoryForklift(normalizedRole);
  const heightMandatory = isMandatoryHeight(normalizedRole);

  const craneStatus = checkStatus(trainings.craneTrainingDate, craneMandatory);
  const forkliftStatus = checkStatus(trainings.forkliftTrainingDate, forkliftMandatory);
  const heightStatus = checkStatus(trainings.heightTrainingDate, heightMandatory);

  const isOverallIrregular = 
    craneStatus === 'IRREGULAR' || 
    forkliftStatus === 'IRREGULAR' || 
    heightStatus === 'IRREGULAR';

  const isMandatory = craneMandatory || forkliftMandatory || heightMandatory;
  const hasAnyTraining = !!trainings.craneTrainingDate || !!trainings.forkliftTrainingDate || !!trainings.heightTrainingDate;
  const isEventual = !isMandatory && hasAnyTraining;

  const isEligible = isMandatory || isEventual;

  return {
    employee,
    trainings,
    craneStatus,
    forkliftStatus,
    heightStatus,
    overallStatus: isOverallIrregular ? 'IRREGULAR' : 'REGULAR',
    isEligible,
    isMandatory,
    isEventual,
  };
};
