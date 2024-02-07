// import { JSONPreset } from 'lowdb/node'

// const defaultData = { people: ['Patrick'] }
// const db = await JSONPreset('db.json', defaultData)

// export default db;

import mongoose from "mongoose";

const connect = () => {
  const url = process.env.MONGO_CONNECTION_STRING;
  mongoose.connect(url);
  mongoose.connection.once("open", async () => {
    console.log("Connected to database");
  });
  mongoose.connection.on("error", (err) => {
    console.error("Error connecting to database  ", err);
  });
};

const disconnect = () => {
  if (!mongoose.connection) {
    return;
  }
  mongoose.disconnect();
  mongoose.connection.once("close", async () => {
    console.log("Diconnected  to database");
  });
};

export default { connect, disconnect };
