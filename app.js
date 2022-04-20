const express = require('express');
const path = require('path');
const { body, validationResult } = require("express-validator");
const indexRouter = require('./routes/index');
const flightRouter = require('./routes/flight');


const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/flight', flightRouter);

module.exports = app;
