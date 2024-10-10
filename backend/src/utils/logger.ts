import * as winston from 'winston';
import chalk from 'chalk';

const format = winston.format.combine(
    winston.format.timestamp({
        format: 'HH:mm:ss.SSS'
      }),
  winston.format.printf(info => {
    let message = `${chalk.gray(info.timestamp)}: ${info.level}: ${info.message}`;
    if (info.id) {
      message = `${chalk.gray(info.id)} ${message}`;
    }
    
    switch(info.level) {
      case 'error': message = chalk.red(message); console.error(message); break;
      case 'warn': message = chalk.yellow(message); break;
      case 'info': message = chalk.green(message); break;
      case 'debug': message = chalk.blue(message); break;
    }

    return message;
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug', // Default to 'debug' if LOG_LEVEL is not set
  format: format,
  transports: [
    new winston.transports.Console(),
  ],
});

export default logger;
