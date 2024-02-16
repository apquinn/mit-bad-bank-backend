import express from "express";
const app = express();
import cors from "cors";
import db from "./db.mjs";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { User } from "./entities/models/user.mjs";
import { Transactions } from "./entities/models/transactions.mjs";
import { UserController } from "./entities/user/user.controller.mjs";

app.use(cors());
dotenv.config();
db.connect();
app.use(bodyParser.json());

const userController = new UserController();

async function getUsername(email) {
  const trans = await User.where("email").equals(email);
  const transArray = Object.entries(trans);
  if (transArray.length > 0) return transArray[0][1].name;
  else return "Name not found";
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
  console.log(sortedBalances);
  res.send(sortedBalances);
}

app.get("/get-all-transactions/:email/:date", async (req, res) => {
  const trans = await Transactions.where("email")
    .equals(req.params.email)
    .sort({ dateTime: "asc" });
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

app.post("/login", async (req, res) => {
  try {
    const response = await userController.login(
      req.body.email,
      req.body.password
    );
    if (response.error === undefined) {
      let username = await getUsername(req.body.email);
      const newTransaction = new Transactions({
        type: "login",
        name: username,
        email: req.body.email,
        action: "login",
        dateTime: Date.now(),
      });
      await newTransaction.save();
      res.send(JSON.stringify(response));
    } else {
      res.send(response.error);
    }
  } catch (err) {
    res.send(err.message);
  }
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

app.post("/signup", async function (req, res) {
  try {
    const trans = await User.where("email").equals(req.body.user.email);
    if (trans.length === 0) {
      const response = await userController.signup(req.body.user);
      res.send(JSON.stringify(response));
    } else {
      res.send("User already exists");
    }
  } catch (err) {
    res.send(err.message);
  }
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

app.get(
  "/transfer/:email/:recipient/:amount/:type/:action",
  async (req, res) => {
    let newTransaction = new Transactions({
      type: req.params.type,
      email: req.params.email,
      action: "Withdrawal",
      amount: req.params.amount,
      dateTime: Date.now(),
    });
    await newTransaction.save();

    newTransaction = new Transactions({
      type: req.params.type,
      email: req.params.recipient,
      action: "Deposit",
      amount: req.params.amount,
      dateTime: Date.now(),
    });
    await newTransaction.save();

    let localBalance = await getBalance(req.params.email, Date.now());
    res.send({ balance: localBalance });
  }
);

app.get("/get-users/:email", async (req, res) => {
  const trans = await User.where("email").ne(req.params.email);
  res.send({ trans });
});

app.get("/get-customers", async (req, res) => {
  const trans = await User.where("email")
    .ne(req.params.email)
    .where("userType")
    .equals("customer");
  res.send({ trans });
});

app.get("/delete-transaction/:id/:email", async (req, res) => {
  await Transactions.deleteOne({ _id: req.params.id });

  const trans = await Transactions.where("email")
    .equals(req.params.email)
    .sort({ dateTime: "asc" });
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

var port = 3001;
app.listen(port);
console.log("Listening on port " + port);
