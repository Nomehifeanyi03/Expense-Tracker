require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const mongoose = require("mongoose");
const { startRecurringJob } = require('./utils/recurringJob');

const authRoutes = require('./routes/authRoutes');
const dns = require("dns");
const categoryRoutes = require('./routes/categoryRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const accountRoutes = require('./routes/accountRoutes');
const reportRoutes = require('./routes/reportRoutes');
const exportRoutes = require('./routes/exportRoutes');

dns.setServers(['8.8.8.8', '8.8.3.3']);

connectDB().then(startRecurringJob);

const app = express();

//Middleware to handle CORS
// app.use(
//     cors({
//         origin: process.env.CLIENT_URL || ".",
//         methods: ["GET", "POST", "PUT", "DELETE"],
//         allowedHeaders: ["Content-Type", "Authorization"],
//     })
// )


app.use(cors({ origin: process.env.CLIENT_URL }));

app.use(express.json());   

app.use('/api/auth', authRoutes);   
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/export', exportRoutes);


app.get('/', (req, res) => {
    res.json({message: 'Expense Tracker API is running' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});