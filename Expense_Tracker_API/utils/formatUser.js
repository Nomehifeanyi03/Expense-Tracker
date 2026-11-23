// Picks only the fields that are safe to send back to the frontend

const formatUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  defaultCurrency: user.defaultCurrency,
  dateFormat: user.dateFormat,
  theme: user.theme,
  emailAlertsEnabled: user.emailAlertsEnabled,
  weeklySummaryEnabled: user.weeklySummaryEnabled,
  rolloverEnabled: user.rolloverEnabled,
});

module.exports = formatUser;