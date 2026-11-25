const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Notification = require('../models/Notification');
const checkBudgetAlerts = require('./checkBudgetAlerts');
const { nextOccurrence } = require('./recurrence');

const MAX_PER_TEMPLATE = 366;
const ONE_HOUR = 60 * 60 * 1000;
let running = false;

// Creates every copy that is due for one repeating entry
const processTemplate = async (template, now) => {
  const user = await User.findById(template.user).select('defaultCurrency');
  if (!user) return;

  const { frequency, endDate } = template.recurring;
  const anchor = template.recurring.startDate || template.date;
  let due = template.recurring.nextRunDate;
  let created = 0;

  while (due <= now && created < MAX_PER_TEMPLATE) {
    if (endDate && due > endDate) {
      await Transaction.updateOne({ _id: template._id }, { $unset: { recurring: '' } });
      break;
    }

    const next = nextOccurrence(due, frequency, anchor);

    const claimed = await Transaction.findOneAndUpdate(
      { _id: template._id, 'recurring.nextRunDate': due },
      { 'recurring.nextRunDate': next }
    );
    if (!claimed) break;

    await Transaction.create({
      user: template.user,
      type: template.type,
      amount: template.amount,
      date: due,
      category: template.category,
      paymentMethod: template.paymentMethod,
      description: template.description,
      notes: template.notes,
      tags: [...template.tags],
      generatedFrom: template._id,
    });

    if (template.type === 'expense') {
      await checkBudgetAlerts(user, template.category, due);
    }

    created++;
    due = next;
  }

  if (created > 0) {
    const label = template.description || 'A recurring entry';
    await Notification.create({
      user: template.user,
      type: 'recurring_created',
      title: 'Recurring entry added',
      message: `${label} was added automatically ${created === 1 ? 'once' : `${created} times`}.`,
    });
    console.log(`Recurring: added ${created} entries for "${label}"`);
  }
};

// Finds every repeating entry that is due and processes it
const processRecurring = async () => {
  if (running) return;
  running = true;

  try {
    const now = new Date();
    const templates = await Transaction.find({
      'recurring.frequency': { $exists: true, $ne: null },
      'recurring.nextRunDate': { $lte: now },
    });

    for (const template of templates) {
      try {
        await processTemplate(template, now);
      } catch (error) {
        console.error('Recurring entry failed:', error.message);
      }
    }
  } finally {
    running = false;
  }
};

// Runs the check once at startup, then every hour
const startRecurringJob = () => {
  processRecurring().catch((error) => console.error('Recurring job failed:', error.message));
  setInterval(() => {
    processRecurring().catch((error) => console.error('Recurring job failed:', error.message));
  }, ONE_HOUR);
};

module.exports = { processRecurring, startRecurringJob };