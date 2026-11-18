const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

// In production, stream logs to standard output for Render / Cloud log monitoring
let logStream = process.stdout;

if (process.env.NODE_ENV !== 'production') {
  try {
    const logDir = path.join(__dirname, '../../logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    logStream = fs.createWriteStream(path.join(logDir, 'access.log'), { flags: 'a' });
  } catch (err) {
    console.warn('⚠️ Could not open log file stream, falling back to stdout:', err.message);
    logStream = process.stdout;
  }
}

module.exports = morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
  stream: logStream
});
