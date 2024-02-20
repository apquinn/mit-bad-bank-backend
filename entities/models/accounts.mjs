import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: "string",
  email: "string",
});

export const Accounts = mongoose.model("accounts", userSchema);
