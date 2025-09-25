var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var config = require('./config');
var db = require('./db/pool');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// Health endpoint
app.get('/healthz', async function(req, res) {
  try {
    const ok = await db.healthcheck();
    res.status(200).json({ status: 'ok', db: ok ? 'up' : 'down' });
  } catch (err) {
    res.status(503).json({ status: 'degraded', db: 'down' });
  }
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler (JSON response)
app.use(function(err, req, res, next) {
  var status = err.status || 500;
  var payload = {
    message: err.message || 'Internal Server Error'
  };
  if (config.env === 'development') {
    payload.stack = err.stack;
  }
  res.status(status).json(payload);
});

module.exports = app;
