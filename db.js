const { MongoClient } = require("mongodb");
require("dotenv").config();
let dbConnection;
const uri = process.env.MONGOURI;
module.exports = {
  connectToDb: (cb) => {
    //tc4bwVzS0yLDd6DU
    MongoClient.connect(uri)
      .then((client) => {
        dbConnection = client.db();
        return cb();
      })
      .catch((err) => {
        console.log(err);
        // we return a callback with an error
        return cb(err);
      });
  },
  getDb: () => dbConnection,
};
