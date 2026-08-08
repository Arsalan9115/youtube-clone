import jwt from "jsonwebtoken";
import User from "../models/user.js";

const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]; // "Bearer TOKEN"

    if (!token) {
      return res.status(401).json({ message: "Access Denied. No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET); // tera JWT_SECRET
    req.user = await User.findById(decoded.id).select("-password");

    if(!req.user){
      return res.status(401).json({ message: "User not found" });
    }

    next();
  } catch (error) {
    res.status(400).json({ message: "Invalid Token" });
  }
};

export default verifyToken;