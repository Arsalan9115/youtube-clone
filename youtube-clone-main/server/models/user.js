import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  plan: { type: String, default: "Free" }, // <-- YE ADD KARNA HAI
  isPremium: { type: Boolean, default: false },
  razorpayCustomerId: { type: String }
}, { timestamps: true });

// overwrite error fix
export default mongoose.models.User || mongoose.model('User', userSchema);