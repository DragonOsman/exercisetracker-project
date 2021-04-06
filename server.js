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
  username: { type: String, unique: true }, // can't have someone register more than once
  exercises: { type: Array }
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

  User.findOne({ username: username }, (err, foundUser) => {
    if (err) {
      console.log(err);
    }

    if (foundUser) {
      res.json({
        username: foundUser.username,
        _id: foundUser._id
      });
    } else {
      const user = new User({
        username: username
      });

      user.save((err, user) => {
        if (err) {
          console.log(err);
          return res.status(500).send("unable to add user");
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

app.post("/api/exercise/add", (req, res) => {
  const userId = req.body.userId;
  const description = req.body.description;
  const duration = Number(req.body.duration);
  const currentDate = new Date();

  // use date provided by user or use current date
  const reqDate = new Date(req.body.date);
  const date = reqDate ? reqDate.toDateString() : currentDate.toDateString();
  User.findByIdAndUpdate(userId, {
    $push: {
      exercises: {
        description: description,
        duration: duration,
        date: date
      }
    }
  }, { new: true, useFindAndModify: false }, (err, foundUser) => {
    if (err) {
      console.log(err);
      res.json({ error: err });
    }

    if (foundUser) {
      res.json({
        username: foundUser.username,
        _id: foundUser._id,
        description: description,
        duration: duration,
        date: date
      });
    }
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

app.get("/api/exercise/log", (req, res) => {
  const makeTwoDigits = number => {
    return number < 10
      ? `0${number}`
      : `${number}`;
  };
  const formatDate = date => {
    return `${date.getFullYear()}-${makeTwoDigits(date.getMonth())}-${makeTwoDigits(date.getDate())}`;
  };
  const userId = req.query.userId;
  const fromDate = req.query.from ? formatDate(new Date(req.query.from)) : undefined;
  const toDate = req.query.to ? formatDate(new Date(req.query.to)) : undefined;
  const logLimit = req.query.limit ? Number(req.query.limit) : undefined;

  const isLeapYear = year => {
    if (year % 4 === 0) {
      if (year % 100 === 0) {
        if (year % 400 === 0) {
          return true;
        }
      }
    }
    return false;
  };

  const isDateValid = date => {
    // more than 29 days in February during leap year
    // or more than 28 days in February during common year
    // is invalid date and a negative date is invalid
    if (isLeapYear(date.getFullYear()) && (date.getMonth() + 1) === 2) {
      if (date.getDate() > 29) {
        return false;
      }
    } else {
      if (date.getDate() > 28) {
        return false;
      }
    }

    if (date.getDate() < 1) {
      return false;
    }

    // more than 31 days in these months is invalid
    // January, March, May, July, August, October, December
    if ((date.getMonth() + 1) === 1 || (date.getMonth() + 1) === 3 || (date.getMonth() + 1) === 7 ||
  (date.getMonth() + 1) === 8 || (date.getMongth() + 1) === 10 || (date.getMonth() + 1) === 12) {
      if (date.getDate() > 31) {
        return false;
      }
    // more than 30 days in these months is invalid
    // April, June, September, October, December
    } else if ((date.getMonth() + 1) === 4 || (date.getMonth() + 1) === 6 ||
  (date.getMonth() + 1) === 9 || (date.getMonth() + 1) === 11) {
      if (date.getDate() > 30) {
        return false;
      }
    }

    if ((date.getMonth() + 1) < 0 || (date.getMonth() + 1) > 12) {
      return false;
    }

    return true;
  };

  User.findById(userId, (err, foundUser) => {
    if (err) {
      console.log(err);
      res.json({ error: err });
    }

    let filteredExercises = [];
    if (foundUser) {
      // when a log limit, a from date, nor a to date is provided
      if (!logLimit && !fromDate && !toDate) {
        res.json({
          username: foundUser.username,
          _id: foundUser._id,
          log: foundUser.exercises,
          count: foundUser.exercises.length + 1
        });
        // when all three are provided
      } else if (logLimit !== undefined && fromDate !== undefined && toDate !== undefined) {
        if (isDateValid(fromDate) && isDateValid(toDate)) {
          filteredExercises = foundUser.exercises.filter(exercise => {
            if (!(exercise.date >= fromDate && exercise.date <= toDate)) {
              return false;
            }
            return true;
          });

          let slicedExercises = [];
          if (logLimit < filteredExercises.length - 1) {
            slicedExercises = filteredExercises.slice(0, logLimit);
          } else {
            slicedExercises = filteredExercises.slice(0);
          }

          res.json({
            username: foundUser.username,
            _id: foundUser._id,
            log: slicedExercises,
            count: slicedExercises.length + 1
          });
        } else {
          console.log("from date and/or to date is/are invalid");
        }
        // when only a log limit is provided
      } else if (logLimit !== undefined && !toDate && !fromDate) {
        const slicedExercises = foundUser.exercises.slice(0, logLimit);

        res.json({
          username: foundUser.username,
          _id: foundUser._id,
          log: slicedExercises,
          count: slicedExercises.length + 1
        });
        // when a log limit and a from date is provided but a to date is not
      } else if (logLimit !== undefined && !toDate && fromDate !== undefined) {
        if (isDateValid(fromDate)) {
          filteredExercises = foundUser.exercises.filter(exercise => {
            if (!(exercise.date >= fromDate)) {
              return false;
            }
            return true;
          });

          const slicedExercises = filteredExercises.slice(0, logLimit);

          res.json({
            username: foundUser.username,
            _id: foundUser._id,
            log: slicedExercises,
            count: slicedExercises.length + 1
          });
        }
        // when a log limit is not provided but a to date and a from date are
      } else if (!logLimit && toDate !== undefined && fromDate !== undefined) {
        if (isDateValid(fromDate) && isDateValid(toDate)) {
          filteredExercises = foundUser.exercises.filter(exercise => {
            if (!(exercise.date >= fromDate && exercise.date <= toDate)) {
              return false;
            }
            return true;
          });

          res.json({
            username: foundUser.username,
            _id: foundUser._id,
            log: filteredExercises,
            count: filteredExercises.length + 1
          });
        }
      }
    }
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
