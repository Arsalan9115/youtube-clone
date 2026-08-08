import express from 'express';
import crypto from 'crypto';
import User from '../models/user.js'; // path check kar lena

const router = express.Router();

router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  
  const shasum = crypto.createHmac('sha256', secret);
  shasum.update(req.body);
  const digest = shasum.digest('hex');
  
  if(digest !== req.headers['x-razorpay-signature']){
    return res.status(400).json({error: 'Invalid signature'});
  }

  const event = JSON.parse(req.body);
  
  if(event.event === 'payment.captured'){
    const payment = event.payload.payment.entity;
    const userId = payment.notes.userId;
    const plan = payment.notes.planCode; // tumne notes me planCode bheja hai
    
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    
    await User.findByIdAndUpdate(userId, { 
      plan: plan,
      planExpiry: expiryDate 
    });
  }
  
  res.json({status: 'ok'});
});

export default router;