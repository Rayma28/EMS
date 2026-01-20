const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const sequelize = require('./config/database');
const routes = require('./routes');

dotenv.config();
const app = express();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use('/api', routes);

const PORT = process.env.PORT || 5002;

sequelize.sync({ alter: true })
  .then(() => console.log('Database synced'))
  .catch(err => console.error('Database sync error:', err));

app.listen(PORT, () => {console.log(` Server: http://localhost:${PORT}`);});
