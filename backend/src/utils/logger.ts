import winston from 'winston';
import { config } from '../config';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    // Add metadata if exists
    if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
    }
    
    // Add stack trace for errors
    if (stack) {
        msg += `\n${stack}`;
    }
    
    return msg;
});

// Create logger instance
export const logger = winston.createLogger({
    level: config.logging.level,
    format: combine(
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
    ),
    transports: [
        // Console output
        new winston.transports.Console({
            format: combine(
                colorize(),
                logFormat
            )
        }),
        // File output for errors
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error'
        }),
        // File output for all logs
        new winston.transports.File({
            filename: 'logs/combined.log'
        })
    ]
});

// Create logs directory if it doesn't exist
import fs from 'fs';
if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs');
}

export default logger;
