const nodemailer = require('nodemailer');


const sendEmail = async ({ to, subject, text }) => {
  if (!process.env.SMTP_HOST) {
    console.log('\n--- EMAIL (no email service set up, printing here instead) ---');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(text);
    console.log('--------------------------------------------------------------\n');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
  });
};

module.exports = sendEmail;