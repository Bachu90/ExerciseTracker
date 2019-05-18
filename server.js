const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const cors = require('cors');

const mongoose = require('mongoose');
mongoose.connect('mongodb://admin:enter6@ds159036.mlab.com:59036/exercise-tracker', { useMongoClient: true });
const shortid = require('shortid');

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())


app.use(express.static('public'));


const User = mongoose.model('User', new mongoose.Schema({
  username: String,
  userId: String
}));

const Exercise = mongoose.model('Exercise', new mongoose.Schema({
  userId: String,
  description: String,
  duration: Number,
  date: Date
}));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/exercise/new-user', (req, res) => {
  const newUser = new User({ username: req.body.username, userId: shortid.generate() });
  newUser.save((err, data) => {
    if (err) {
      res.json({ error: err });
    } else {
      res.json({ username: data.username, userId: data.userId });
    }
  })
});

app.post('/api/exercise/add', (req, res) => {
  const date = new Date(req.body.date);
  const newExercise = new Exercise({
    userId: req.body.userId,
    description: req.body.description,
    duration: req.body.duration,
    date: date
  });

  newExercise.save((err, data) => {
    if (err) {
      res.json({ error: err });
    } else {
      res.json({
        userId: data.userId,
        description: data.description,
        duration: data.duration,
        date: data.date
      })
    }
  })
});

app.get('/api/exercise/log', (req, res) => {
  const userId = req.query.userId;
  User.findOne({ userId: userId }, (err, userData) => {
    Exercise.find({ userId: userId }, (err, exerciseData) => {
      let log = exerciseData.map(entry => {
        return {
          description: entry.description,
          duration: entry.duration,
          date: entry.date
        }
      }).sort((a, b) => b.date - a.date);

      if (req.query.from) {
        const from = new Date(req.query.from);
        log = log.filter(entry => entry.date >= from);
      }

      if (req.query.to) {
        const to = new Date(req.query.to);
        log = log.filter(entry => entry.date <= to);
      }

      if (req.query.limit) {
        log = log.filter((entry, index) => index < req.query.limit);
      }

      res.json({
        _id: userId,
        username: userData.username,
        count: exerciseData.length,
        log: log
      })
    })
  });

})


// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: 'not found' })
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
