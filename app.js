var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var config = require('./config');
var db = require('./db/pool');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var authRouter = require('./routes/auth');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Backend API Docs'
}));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api/auth', authRouter); 

app.get('/healthz', async function(req, res) {
  try {
    const ok = await db.healthcheck();
    res.status(200).json({ status: 'ok', db: ok ? 'up' : 'down' });
  } catch (err) {
    res.status(503).json({ status: 'degraded', db: 'down' });
  }
});

app.use(function(req, res, next) {
  next(createError(404));
});

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
