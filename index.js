const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const { type } = require('express/lib/response')
require('dotenv').config()

app.use(cors())
app.use(bodyParser.urlencoded())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});
mongoose.connect(process.env.MONGODB_URL);

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  }
})

const ExercisesSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  duration: {
    type: String,
    required: true,
  },
  date: {
    type: String,
    required: true,
  }
})

const User = mongoose.model('MyUser', UserSchema);
const Exercises = mongoose.model('MyExercises', ExercisesSchema);

app.post('/api/users', async (req, res) => {
  try {
    const newUser = new User({
      username: req.body.username,
    })
    const savedUser = await newUser.save();
    res.json({username: savedUser.username, _id: savedUser._id})
  } catch (error) {
    res.json({ error: "Can't add user to DB"})
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const listOfUsers = await User.find().exec();
    const listOfUserReadyToSend = [];
    listOfUsers.map(({username, _id}, i) => {
      listOfUserReadyToSend.push({username: username, _id: _id});
    })
    res.send(listOfUserReadyToSend)
  } catch (error) {
    res.json({ error: "Can't add user to DB"})
  }
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const theuserId = req.params._id;
    const exDate = req.body.date ? new Date(req.body.date).toDateString() : new Date().toDateString();
    const newExercise = new Exercises({
      userId: theuserId,
      description: req.body.description,
      duration: req.body.duration,
      date: exDate
    })
    const savedExercise = await newExercise.save();
    const currentUser = await User.findById(theuserId).exec();
    res.json({	
      _id: savedExercise.userId,
      username: currentUser.username,
      date: savedExercise.date,
      duration: parseInt(savedExercise.duration),
      description: savedExercise.description })
  } catch (error) {
    res.json({ error: "can't add exercise to DB" })
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const theuserId = req.params._id;
    const { from, to, limit } = req.query;

    // Find the user
    const currentUser = await User.findById(theuserId).exec();
    if (!currentUser) {
      return res.json({ error: "User not found" });
    }

    // Build the query for exercises
    let query = { userId: theuserId };

    // Add date filtering if `from` or `to` are provided
    if (from || to) {
      query.date = {};
      if (from) {
        query.date.$gte = new Date(from); // Filter dates >= from
      }
      if (to) {
        query.date.$lte = new Date(to); // Filter dates <= to
      }
    }

    // Find exercises
    let exercisesQuery = Exercises.find(query);

    // Apply limit if provided
    if (limit) {
      exercisesQuery = exercisesQuery.limit(parseInt(limit));
    }

    const listOfExercises = await exercisesQuery.exec();

    // Format the exercises for the response
    const listOfExercisesReadyToSend = listOfExercises.map((exercise) => ({
      description: exercise.description,
      duration: parseInt(exercise.duration),
      date: new Date(exercise.date).toDateString(), // Ensure date is in the correct format
    }));

    // Send the response
    res.json({
      username: currentUser.username,
      count: listOfExercisesReadyToSend.length,
      _id: theuserId,
      log: listOfExercisesReadyToSend,
    });
  } catch (error) {
    console.error(error);
    res.json({ error: "Can't find the given user in DB" });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
