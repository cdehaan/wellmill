export function ValidateBirthdayString(birthdayString: string): boolean {
  // Check if the input is in the format  YYYY-MM-DD  or  YYYY/MM/DD
  const datePattern = /^\d{4}[-/]\d{2}[-/]\d{2}$/;
  const birthdayFormatError = !datePattern.test(birthdayString);
  if (birthdayFormatError) {
    return false;
  }

  // Split the string into components
  const [year, month, day] = birthdayString.replace(/\//g, '-').split('-').map(Number);

  // Check if the date is valid
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}
