const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

// simple request logger using morgan; writes to stdout and a rotating log file
const accessLogStream = fs.createWriteStream(path.join(__dirname, '../../logs/access.log'), { flags: 'a' });

module.exports = morgan('dev', {
  stream: accessLogStream
});
