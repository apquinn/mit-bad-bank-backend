import express from "express";
const app = express();
import cors from "cors";
import db from "./db.mjs";

app.use(cors());

app.get("/account/create/:name/:email/:password", function (req, res) {
  res.send({
    name: req.params.name,
    email: req.params.email,
    password: req.params.password,
  });
});

app.get("/account/login/:email/:password", (req, res) => {
  res.send({
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

app.get("/transaction/:amount", (req, res) => {
  res.send({
    amount: req.params.amount,
  });
});

var port = 3001;
app.listen(port);
console.log("Listening on port " + port);
