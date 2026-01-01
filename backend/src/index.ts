import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { eventRoutes } from './routes/eventRoutes';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// ==================== Middleware ====================

// CORS Configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
    credentials: true
}));

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request Logging
app.use((req: Request, res: Response, next: NextFunction) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
    next();
});

// ==================== Routes ====================

// Health Check
app.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV
    });
});

// API Info
app.get('/', (req: Request, res: Response) => {
    res.json({
        name: 'SuiStage Event Management API',
        version: '1.0.0',
        role: 'Role 2 - Event Management System',
        endpoints: {
            events: '/api/events',
            health: '/health'
        }
    });
});

// API Routes
app.use('/api/events', eventRoutes);

// ==================== Error Handling ====================

// 404 Handler
app.use((req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

// Global Error Handler
app.use(errorHandler);

// ==================== Server Start ====================

app.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`📝 Environment: ${process.env.NODE_ENV}`);
    logger.info(`🌐 Network: ${process.env.SUI_NETWORK}`);
    logger.info(`📦 Package ID: ${process.env.PACKAGE_ID || 'Not set'}`);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
});

export default app;
