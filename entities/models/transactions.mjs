import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  type: "string",
  name: "string",
  email: "string",
  password: "string",
  action: "string",
  amount: "number",
  dateTime: "number",
  balance: "number",
});

export const Transactions = mongoose.model("transaction", userSchema);
