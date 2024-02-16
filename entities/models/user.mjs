import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: "string",
  email: { type: String, unique: true },
  password: "string",
  userType: "string",
});

export const User = mongoose.model("users", userSchema);
