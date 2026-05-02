export interface EmployeeData {
  re: string;
  name: string;
  role: string;
  area: string;
  unit: string;
  manager: string;
  status: string; // "Ativo"
}

export interface TrainingData {
  re: string;
  craneTrainingDate: Date | null;
  forkliftTrainingDate: Date | null;
  heightTrainingDate: Date | null;
}

export interface EmployeeStatus {
  employee: EmployeeData;
  trainings: TrainingData;
  craneStatus: 'REGULAR' | 'IRREGULAR' | 'NAO_APLICAVEL';
  forkliftStatus: 'REGULAR' | 'IRREGULAR' | 'NAO_APLICAVEL';
  heightStatus: 'REGULAR' | 'IRREGULAR' | 'NAO_APLICAVEL';
  overallStatus: 'REGULAR' | 'IRREGULAR';
  isEligible: boolean;
  isMandatory: boolean;
  isEventual: boolean;
}

export type TrainingType = 'CRANE' | 'FORKLIFT' | 'HEIGHT';
