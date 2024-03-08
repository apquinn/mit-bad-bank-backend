import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  type: "string",
  name: "string",
  email: "string",
  password: "string",
  action: "string",
  amount: "number",
  dateTime: "number",
  account: "string",
  balance: "string",
  pending: "string",
  checkNumber: "string",
});

export const Transactions = mongoose.model("transaction", userSchema);
