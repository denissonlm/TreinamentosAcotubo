const { differenceInYears } = require('date-fns');
const checkStatus = (date, isMandatory) => {
  if (!date) return isMandatory ? 'IRREGULAR' : 'NAO_APLICAVEL';
  const yearsSinceTraining = differenceInYears(new Date(), date);
  if (yearsSinceTraining >= 2) return 'IRREGULAR';
  return 'REGULAR';
};

console.log("Check Status (Mandatory, 2025):", checkStatus(new Date(2025, 4, 10), true));
console.log("Check Status (Mandatory, 2023):", checkStatus(new Date(2023, 3, 20), true));
