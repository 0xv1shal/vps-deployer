export const convertDateToIST = (input: number): string => {
  // Handles timestamps, ISO strings, or Date objects
  const date = new Date(input);

  // Check for invalid dates
  if (isNaN(date.getTime())) return "Invalid Date";

  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};
