import mongoose from "mongoose";

const connect = () => {
  const url = process.env.MONGO_CONNECTION_STRING;
  mongoose.connect(url);
  mongoose.connection.once("open", async () => {
    const dbname = "myproject";
    const db = client.db(dbname);

    var name = "user" + Math.floor(Math.random() * 10000);
    var email = name + "@mit.edu";

    var collection = db.collection("customers");
    var doc = { name, email };
    collection.insertOne(doc, { w: 1 }, function (err, result) {
      if (err) {
        console.log(err.message);
      }
      console.log("document insert");
    });
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
