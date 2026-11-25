const FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'];

// Number of days in a month (the month counts from 0, so November is 10)
const daysInMonth = (year, month) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

// Works out the date of the next repeat
const nextOccurrence = (current, frequency, anchor) => {
  const year = current.getUTCFullYear();
  const month = current.getUTCMonth();
  const day = current.getUTCDate();

  if (frequency === 'daily') return new Date(Date.UTC(year, month, day + 1));
  if (frequency === 'weekly') return new Date(Date.UTC(year, month, day + 7));

  const nextYear = frequency === 'yearly' ? year + 1 : year;
  const nextMonth = frequency === 'yearly' ? anchor.getUTCMonth() : month + 1;
  const nextDay = Math.min(anchor.getUTCDate(), daysInMonth(nextYear, nextMonth));

  return new Date(Date.UTC(nextYear, nextMonth, nextDay));
};

// Checks the "recurring" part of a request.
// Returns { recurring } to turn repeating on, { clear: true } to turn it off,
// { error } for bad input, or {} when nothing was sent.
const parseRecurring = (input, date) => {
  if (input === undefined) return {};
  if (input === null || input.frequency === null || input.frequency === '') {
    return { clear: true };
  }

  if (typeof input !== 'object' || !FREQUENCIES.includes(input.frequency)) {
    return { error: 'Repeat must be daily, weekly, monthly or yearly' };
  }

  const start = new Date(date);
  let endDate;

  if (input.endDate) {
    endDate = new Date(input.endDate);
    if (isNaN(endDate)) return { error: 'Invalid end date' };
    if (endDate < start) return { error: 'End date must be after the start date' };
  }

  return {
    recurring: {
      frequency: input.frequency,
      startDate: start,
      nextRunDate: nextOccurrence(start, input.frequency, start),
      endDate,
    },
  };
};

module.exports = { FREQUENCIES, nextOccurrence, parseRecurring };