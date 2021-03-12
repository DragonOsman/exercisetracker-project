const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const path = require("path");
const bodyParser = require("body-parser");

app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(path.join(`${__dirname}`, "/views/index.html"));
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post("/api/exercise/new-user", (req, res) => {
  console.log(`${req.body}`);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
