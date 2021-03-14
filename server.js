const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const path = require("path");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

mongoose.connect(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const Schema = mongoose.Schema;
const userSchema = new Schema({
  username: { type: String, unique: true } // can't have someone register more than once
});

const User = mongoose.model("user", userSchema);

app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(path.join(`${__dirname}`, "/views/index.html"));
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post("/api/exercise/new-user", (req, res) => {
  const username = req.body.username;

  const user = new User({
    username: username
  });

  User.findOne({ username: username }, (err, foundUser) => {
    if (err) {
      console.log(err);
    }

    if (!foundUser) {
      user.save((err, user) => {
        if (err) {
          console.log(err);
        }
        console.log(`user ${user.username} saved to database!`);
      });
    }

    res.json({
      username: user.username,
      _id: user._id
    });
  });
});

app.post("/api/exercise/add", (req, res) => {
  const { userId, description, duration } = req.body;
  const currentDate = new Date();

  // use date provided by user or use current date
  const date = req.body.date ||
  `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${currentDate.getDate()}`;

  User.findOne({ _id: userId }, (err, foundUser) => {
    if (err) {
      console.log(err);
      res.json({ error: err });
    }

    res.json({
      username: foundUser.username,
      _id: foundUser._id,
      description: description,
      duration: duration,
      date: date
    });
  });
});

app.get("/api/exercise/users", (req, res) => {
  User.find({}, (err, foundUsers) => {
    if (err) {
      console.log(err);
      res.json({ error: err });
    }

    if (foundUsers.length === 0) {
      res.json({ error: "No users in database" });
    }

    res.json(foundUsers.map(user => {
      const { __v, ...rest } = user._doc;
      return rest;
    }));
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
