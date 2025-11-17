const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log levels
const LogLevel = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

// Colors for console output
const colors = {
  ERROR: '\x1b[31m', // Red
  WARN: '\x1b[33m',  // Yellow
  INFO: '\x1b[36m',  // Cyan
  DEBUG: '\x1b[90m', // Gray
  RESET: '\x1b[0m'
};

class Logger {
  constructor(module = 'APP') {
    this.module = module;
    this.logFile = path.join(logsDir, 'app.log');
    this.errorFile = path.join(logsDir, 'error.log');
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
    return `[${timestamp}] [${level}] [${this.module}] ${message} ${metaStr}`;
  }

  writeToFile(filename, message) {
    try {
      fs.appendFileSync(filename, message + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  log(level, message, meta = {}) {
    const formattedMessage = this.formatMessage(level, message, meta);
    
    // Console output with colors
    const color = colors[level] || colors.RESET;
    console.log(`${color}${formattedMessage}${colors.RESET}`);
    
    // Write to file
    this.writeToFile(this.logFile, formattedMessage);
    
    // Write errors to separate file
    if (level === LogLevel.ERROR) {
      this.writeToFile(this.errorFile, formattedMessage);
    }
  }

  error(message, meta = {}) {
    this.log(LogLevel.ERROR, message, meta);
  }

  warn(message, meta = {}) {
    this.log(LogLevel.WARN, message, meta);
  }

  info(message, meta = {}) {
    this.log(LogLevel.INFO, message, meta);
  }

  debug(message, meta = {}) {
    if (process.env.NODE_ENV === 'development') {
      this.log(LogLevel.DEBUG, message, meta);
    }
  }

  // Request logging middleware
  static requestLogger() {
    return (req, res, next) => {
      const logger = new Logger('HTTP');
      const startTime = Date.now();

      // Log request
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        userId: req.user?.id
      });

      // Log response
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const level = res.statusCode >= 400 ? 'ERROR' : 'INFO';
        
        logger[level.toLowerCase()](`${req.method} ${req.path} ${res.statusCode}`, {
          duration: `${duration}ms`,
          userId: req.user?.id
        });
      });

      next();
    };
  }

  // Error logging middleware
  static errorLogger() {
    return (err, req, res, next) => {
      const logger = new Logger('ERROR');
      
      logger.error(err.message, {
        stack: err.stack,
        path: req.path,
        method: req.method,
        userId: req.user?.id,
        body: req.body
      });

      next(err);
    };
  }
}

module.exports = Logger;
