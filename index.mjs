import express from "express";
const app = express();
import cors from "cors";
import db from "./db.mjs";
import dotenv from "dotenv";
import { User } from "./entities/models/user.mjs";
import { Transactions } from "./entities/models/transactions.mjs";

app.use(cors());
dotenv.config();
db.connect();

async function getUsername(email) {
  const trans = await User.where("email").equals(email);
  const transArray = Object.entries(trans);
  return transArray[0][1].name;
}

async function getBalance(email, date) {
  const trans = await Transactions.where("type")
    .equals("transaction")
    .where("email")
    .equals(email)
    .where("dateTime")
    .lte(date);
  const transArray = Object.entries(trans);

  let amountTotal = 0;
  const output = transArray.map((entry) => {
    amountTotal = amountTotal + Number(entry[1].amount);
  });
  return amountTotal;
}

function callback(res, balances) {
  const sortedBalances = balances.toSorted((a, b) => a.dateTime - b.dateTime);

  res.send(sortedBalances);
}

app.get("/get-all-transactions/:email/:date", async (req, res) => {
  const trans = await Transactions.where("email").equals(req.params.email);
  const transArray = Object.entries(trans);

  let balances = [];
  var itemsProcessed = 0;
  transArray.forEach(async (entry, index, insideArray) => {
    getBalance(req.params.email, entry[1].dateTime).then((balance) => {
      if (entry[1].type === "transaction") {
        entry[1].balance = balance;
      }
      balances.push(entry[1]);
      itemsProcessed++;
      if (itemsProcessed === insideArray.length) {
        callback(res, balances);
      }
    });
  });
});

app.get("/get-balance/:email/:date", async (req, res) => {
  let localBalance = await getBalance(req.params.email, req.params.date);
  res.send({ balance: localBalance });
});

app.get("/login/:email/:password", async (req, res) => {
  let username = await getUsername(req.params.email);
  const newTransaction = new Transactions({
    type: "login",
    name: username,
    email: req.params.email,
    password: req.params.password,
    action: "login",
    dateTime: Date.now(),
  });
  await newTransaction.save();

  res.send({
    name: username,
    email: req.params.email,
    password: req.params.password,
  });
});

app.get("/logout/:email", async (req, res) => {
  let username = await getUsername(req.params.email);
  const newTransaction = new Transactions({
    type: "logout",
    name: username,
    email: req.params.email,
    dateTime: Date.now(),
  });
  await newTransaction.save();

  res.send({
    email: req.params.email,
  });
});

app.get("/account/create/:name/:email/:password", async function (req, res) {
  const newUser = new User({
    name: req.params.name,
    email: req.params.email,
    password: req.params.password,
  });
  await newUser.save();

  let newTransaction = new Transactions({
    type: "create user",
    name: req.params.name,
    email: req.params.email,
    password: req.params.password,
    balance: 100,
    loggedin: false,
  });
  await newTransaction.save();

  newTransaction = new Transactions({
    type: "login",
    name: req.params.name,
    email: req.params.email,
    password: req.params.password,
    action: "login",
    dateTime: Date.now(),
  });
  await newTransaction.save();

  res.send({
    name: req.params.name,
    email: req.params.email,
    password: req.params.password,
  });
});

app.get("/account/all", (req, res) => {
  res.send({
    name: "peter",
    email: "peter@mit.edu",
    password: "secret",
  });
});

app.get("/transaction/:email/:amount/:type/:action", async (req, res) => {
  const newTransaction = new Transactions({
    type: req.params.type,
    email: req.params.email,
    action: req.params.action,
    amount: req.params.amount,
    dateTime: Date.now(),
  });
  await newTransaction.save();

  let localBalance = await getBalance(req.params.email, Date.now());
  res.send({ balance: localBalance });
});

var port = 3001;
app.listen(port);
console.log("Listening on port " + port);
