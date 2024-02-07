import express from "express";
import dotenv from "dotenv";
const app = express();
import db from "./db.mjs";

// Configure dotenv
dotenv.config();
db.connect();

app.post("/test", async (req, res) => {
  db.data.people.push("Drew Quinn");
  await db.write();
  res.sendStatus(200);
});

var PORT = 3001;
app.listen(PORT, () => {
  console.log(`🔥 Test running on Port:${PORT} 🔥`);
});
