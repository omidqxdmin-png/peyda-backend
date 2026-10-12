const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');

const app = express();
app.use(express.json());

// اتصال به دیتابیس MongoDB Atlas
const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// اسکیما و مدل ذخیره کاربران و کد تایید
const userSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  code: String,
  createdAt: { type: Date, default: Date.now, expires: 120 }
});
const User = mongoose.model('User', userSchema);

// روت ارسال کد تایید OTP
app.post('/api/send-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ success: false, message: 'شماره موبایل الزامی است' });
  }

  const code = Math.floor(10000 + Math.random() * 90000).toString();

  try {
    await User.findOneAndUpdate(
      { phone },
      { code, createdAt: Date.now() },
      { upsert: true, new: true }
    );

    // ارسال پیامک از طریق IPPanel
    await axios.post('https://api.ip-panel.com/v1/sms/send/webservice/single', {
      sender: process.env.IPPANEL_SENDER,
      recipient: phone,
      message: `کد تایید اپلیکیشن پیدا: ${code}`
    }, {
      headers: {
        'apikey': process.env.IPPANEL_PASSWORD
      }
    });

    res.json({ success: true, message: 'کد تایید ارسال شد' });
  } catch (error) {
    console.error('Error sending SMS:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: 'خطا در ارسال پیامک' });
  }
});

// روت بررسی و تایید کد OTP
app.post('/api/verify-otp', async (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) {
    return res.status(400).json({ success: false, message: 'شماره موبایل و کد تایید الزامی هستند' });
  }

  try {
    const user = await User.findOne({ phone });
    if (!user || user.code !== code) {
      return res.status(400).json({ success: false, message: 'کد تایید اشتباه است یا منقضی شده' });
    }

    res.json({ success: true, token: "sample_token_peyda_123", message: 'ورود موفقیت‌آمیز بود' });
  } catch (error) {
    console.error('Error verifying code:', error.message);
    res.status(500).json({ success: false, message: 'خطا در سرور' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
    
