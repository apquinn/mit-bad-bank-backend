import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: "string",
  checkPic: "string",
  dateTime: "number",
  approved: "boolean",
  amount: "number",
});

export const Checks = mongoose.model("checks", userSchema);
