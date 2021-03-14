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

  User.find({}, (err, users) => {
    if (err) {
      console.log(err);
    }

    const id = users.length;

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

          res.json({
            username: user.username,
            _id: user._id
          });
        });
      }
    });
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
