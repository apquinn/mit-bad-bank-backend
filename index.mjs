import express from "express";
const app = express();
import cors from "cors";
import db from "./db.mjs";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { User } from "./entities/models/user.mjs";
import { Transactions } from "./entities/models/transactions.mjs";
import { Accounts } from "./entities/models/accounts.mjs";
import { Checks } from "./entities/models/checks.mjs";
import { UserController } from "./entities/user/user.controller.mjs";
import fileUpload from "express-fileupload";
import path from "path";

app.use(cors());
dotenv.config();
db.connect();
app.use(bodyParser.json());

const userController = new UserController();

async function addAccount(res, email, name) {
  const trans = await Accounts.where("email")
    .equals(email)
    .where("name")
    .equals(name);
  if (trans.length === 0) {
    let newAccounts = new Accounts({
      name: name,
      email: email,
    });
    await newAccounts.save();

    let newTransaction = new Transactions({
      type: "account creation",
      email: email,
      action: "account creation",
      name: name,
      dateTime: Date.now(),
    });
    await newTransaction.save();

    return true;
  } else {
    return `Account with the name ${name} already exists`;
  }
}

async function getUsername(email) {
  const trans = await User.where("email").equals(email);
  const transArray = Object.entries(trans);
  if (transArray.length > 0) return transArray[0][1].name;
  else return "Name not found";
}

async function getBalance(email, date, account) {
  const trans = await Transactions.where("type")
    .equals("transaction")
    .where("email")
    .equals(email)
    .where("dateTime")
    .lte(date)
    .where("account")
    .equals(account);
  const transArray = Object.entries(trans);
  let amountTotal = 0;
  let output = transArray.map((entry) => {
    amountTotal = amountTotal + Number(entry[1].amount);
  });

  const checks = await Checks.where("email")
    .equals(email)
    .where("approved")
    .equals(false)
    .where("dateTime")
    .lte(date);

  const checksArray = Object.entries(checks);

  let checksTotal = 0;
  output = checksArray.map((entry) => {
    checksTotal = checksTotal + Number(entry[1].amount);
  });

  const finalBalance = (amountTotal - checksTotal)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const finalPending = checksTotal
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return { balance: finalBalance, pending: finalPending };
}

function callback(res, balances) {
  let sortedBalances = balances.toSorted((a, b) => a.dateTime - b.dateTime);
  res.send(sortedBalances);
}

app.get("/get-all-transactions/:email/:account/:date", async (req, res) => {
  const trans = await Transactions.find({
    $or: [{ account: req.params.account }, { type: { $ne: "transaction" } }],
  })
    .where("email")
    .equals(req.params.email)
    .sort({ dateTime: "asc" });
  const transArray = Object.entries(trans);

  let balances = [];
  var itemsProcessed = 0;

  if (transArray.length > 0) {
    transArray.forEach(async (entry, index, insideArray) => {
      getBalance(req.params.email, entry[1].dateTime, req.params.account).then(
        (balance) => {
          if (entry[1].type === "transaction") {
            entry[1].balance = balance.balance;
            entry[1].pending = balance.pending;
          }
          balances.push(entry[1]);
          itemsProcessed++;
          if (itemsProcessed === insideArray.length) {
            callback(res, balances);
          }
        }
      );
    });
  } else {
    res.send([]);
  }
});

app.get("/get-balance/:email/:date/:account", async (req, res) => {
  let localBalance = await getBalance(
    req.params.email,
    req.params.date,
    req.params.account
  );
  res.send({ balance: localBalance.balance, pending: localBalance.pending });
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

      if (req.body.user.userType === "customer") {
        let newAccount = addAccount(
          res,
          req.body.user.email,
          "primary checking"
        );
        if (!newAccount) {
          res.send("New account failed to create");
        }
      }

      res.send(JSON.stringify(response));
    } else {
      res.send("User already exists");
    }
  } catch (err) {
    res.send(err.message);
  }
});

app.get(
  "/transaction/:email/:amount/:type/:action/:account",
  async (req, res) => {
    const newTransaction = new Transactions({
      type: req.params.type,
      email: req.params.email,
      action: req.params.action,
      amount: req.params.amount,
      dateTime: Date.now(),
      account: req.params.account,
    });
    await newTransaction.save();

    let localBalance = await getBalance(
      req.params.email,
      Date.now(),
      req.params.account
    );
    res.send({ balance: localBalance.balance, pending: localBalance.pending });
  }
);

app.get(
  "/transfer/:email/:emailAccount/:recipient/:recipientAccount/:amount/:type/:action",
  async (req, res) => {
    let newTransaction = new Transactions({
      type: req.params.type,
      email: req.params.email,
      action: "Withdrawal",
      amount: req.params.amount,
      dateTime: Date.now(),
      account: req.params.emailAccount,
    });
    await newTransaction.save();

    newTransaction = new Transactions({
      type: req.params.type,
      email: req.params.recipient,
      action: "Deposit",
      amount: -req.params.amount,
      dateTime: Date.now(),
      account: req.params.recipientAccount,
    });
    await newTransaction.save();

    let localBalance = await getBalance(
      req.params.email,
      Date.now(),
      req.params.emailAccount
    );
    res.send({ balance: localBalance.balance, pending: localBalance.pending });
  }
);

app.get("/get-users/:email", async (req, res) => {
  const trans = await User.where("email").ne(req.params.email);
  res.send({ trans });
});

app.get("/get-customers/:email", async (req, res) => {
  const trans = await User.where("email")
    .ne(req.params.email)
    .where("userType")
    .equals("customer");
  res.send({ trans });
});

app.get("/get-all-customers", async (req, res) => {
  const trans = await User.where("userType").equals("customer");
  res.send({ trans });
});

app.get("/delete-transaction/:id/:email/:account", async (req, res) => {
  let trans = await Transactions.where("_id").equals(req.params.id);
  if (trans.length > 0 && trans[0].checkNumber !== "") {
    await Checks.deleteOne({ _id: trans[0].checkNumber });
  }

  await Transactions.deleteOne({ _id: req.params.id });

  trans = await Transactions.where("email")
    .equals(req.params.email)
    .sort({ dateTime: "asc" });
  let transArray = Object.entries(trans);

  let balances = [];
  var itemsProcessed = 0;
  if (transArray.length > 0) {
    transArray.forEach(async (entry, index, insideArray) => {
      getBalance(req.params.email, entry[1].dateTime, req.params.account).then(
        (balance) => {
          if (entry[1].type === "transaction") {
            entry[1].balance = balance.balance;
            entry[1].pending = balance.pending;
          }
          balances.push(entry[1]);
          itemsProcessed++;
          if (itemsProcessed === insideArray.length) {
            callback(res, balances);
          }
        }
      );
    });
  } else {
    res.send([]);
  }
});

app.get("/get-profile/:email", async (req, res) => {
  const trans = await User.where("email").equals(req.params.email);
  res.send({ trans });
});

app.get("/get-accounts/:email", async (req, res) => {
  const trans = await Accounts.where("email").equals(req.params.email);
  res.send({ trans });
});

app.get("/add-account/:email/:name", async (req, res) => {
  const result = await addAccount(res, req.params.email, req.params.name);
  if (result === true) {
    const trans = await Accounts.where("email").equals(req.params.email);
    res.send({ trans });
  } else {
    res.send(result);
  }
});

app.get("/close-account/:email/:id/", async (req, res) => {
  const accountName = await Accounts.where("_id").equals(req.params.id);

  const balance = await getBalance(
    req.params.email,
    Date.now(),
    accountName[0].name
  );

  if (Number(balance.balance.replaceAll(",", "")) > 0) {
    res.send(
      "Account has a balance. Please withdraw or transfer funds before attempting to close account"
    );
  } else if (Number(balance.pending.replaceAll(",", "")) > 0) {
    res.send(
      "Account has a pending balance. Please waiting for pending depposit to be approved and then withdraw the balance before attempting to close account"
    );
  } else {
    await Accounts.deleteOne({ _id: req.params.id });

    let newTransaction = new Transactions({
      type: "Account deletion",
      email: req.params.email,
      action: "Account deletion",
      name: accountName[0].name,
      dateTime: Date.now(),
    });
    await newTransaction.save();

    const trans = await Accounts.where("email").equals(req.params.email);
    res.send({ trans });
  }
});

app.use(fileUpload());
app.post("/upload-deposit/:email/:account/:amount", async (req, res) => {
  const filename = Date.now() + "-" + req.files.ImportFile.name;
  const fullPathFilename = path.join("./public/checkFiles", filename);
  req.files.ImportFile.mv(fullPathFilename);

  const newCheck = new Checks({
    email: req.params.email,
    checkPic: filename,
    dateTime: Date.now(),
    approved: false,
    amount: req.params.amount,
  });
  const result = await newCheck.save();

  const newTransaction = new Transactions({
    type: "transaction",
    email: req.params.email,
    action: "check upload",
    amount: req.params.amount,
    dateTime: Date.now(),
    account: req.params.account,
    checkNumber: result._id,
  });
  await newTransaction.save();

  let localBalance = await getBalance(
    req.params.email,
    Date.now(),
    req.params.account
  );
  res.send({ balance: localBalance.balance, pending: localBalance.pending });
});

app.get("/get-all-unapproved", async (req, res) => {
  const trans = await Checks.where("approved")
    .equals(false)
    .sort({ dateTime: "asc" });
  const transArray = Object.entries(trans);

  res.send(transArray);
});

app.get("/approve-check/:checkNumber", async (req, res) => {
  let doc = await Checks.findOneAndUpdate(
    { _id: req.params.checkNumber },
    { approved: true }
  );

  const trans = await Checks.where("approved")
    .equals(false)
    .sort({ dateTime: "asc" });
  const transArray = Object.entries(trans);

  res.send(transArray);
});

app.get("/reject-check/:checkNumber", async (req, res) => {
  await Checks.deleteOne({ _id: req.params.checkNumber });
  await Transactions.deleteOne({ checkNumber: req.params.checkNumber });

  const trans = await Checks.where("approved")
    .equals(false)
    .sort({ dateTime: "asc" });
  const transArray = Object.entries(trans);

  res.send(transArray);
});

app.use("/uploads", express.static("public/checkFiles"));

var port = 3001;
app.listen(port);
console.log("Listening on port " + port);
