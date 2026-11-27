const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        minlength: 6,
        select: false,
        required: function () {
            return !this.googleId;
        },
    },
    googleId: {
        type: String,
        default: null,
    },
    defaultCurrency: { type: String, default: 'USD' },
    dateFormat: { type: String, default: 'MMM D, YYYY' },
    theme: { type: String, enum: ['system', 'light', 'dark'], default: 'system' },

    emailAlertsEnabled: { type: Boolean, default: false },
    weeklySummaryEnabled: { type: Boolean, default: false },
    rolloverEnabled: { type: Boolean, default: false },

    lastActiveAt: { type: Date, default: Date.now },
}, { timestamps: true }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('user', userSchema)