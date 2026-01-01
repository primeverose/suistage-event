import { Request, Response, NextFunction } from 'express';
import * as eventService from '../services/eventService';
import * as walrusService from '../services/walrusService';
import { logger } from '../utils/logger';

/**
 * Get all events
 */
export async function getAllEvents(req: Request, res: Response, next: NextFunction) {
    try {
        const options = {
            page: parseInt(req.query.page as string) || 1,
            limit: parseInt(req.query.limit as string) || 10,
            search: req.query.search as string,
            organizer: req.query.organizer as string,
            isActive: req.query.is_active === 'true' ? true : 
                     req.query.is_active === 'false' ? false : undefined,
            upcoming: req.query.upcoming === 'true'
        };
        
        const result = await eventService.getAllEvents(options);
        
        res.json({
            success: true,
            data: result.events,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get event by ID
 */
export async function getEventById(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        
        let event = await eventService.getEventById(id);
        
        // If not in database, try to sync from chain
        if (!event) {
            logger.info('Event not in database, syncing from chain', { id });
            event = await eventService.syncEventFromChain(id);
        }
        
        if (!event) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }
        
        res.json({
            success: true,
            data: event
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get events by organizer
 */
export async function getEventsByOrganizer(req: Request, res: Response, next: NextFunction) {
    try {
        const { address } = req.params;
        
        const events = await eventService.getEventsByOrganizer(address);
        
        res.json({
            success: true,
            data: events,
            count: events.length
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get upcoming events
 */
export async function getUpcomingEvents(req: Request, res: Response, next: NextFunction) {
    try {
        const limit = parseInt(req.query.limit as string) || 10;
        
        const events = await eventService.getUpcomingEvents(limit);
        
        res.json({
            success: true,
            data: events,
            count: events.length
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get event statistics
 */
export async function getEventStats(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        
        const event = await eventService.getEventById(id);
        if (!event) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }
        
        const stats = await eventService.getEventStats(id);
        
        // Calculate additional metrics
        const soldPercentage = event.total_seats > 0 
            ? ((event.total_seats - event.available_seats) / event.total_seats * 100).toFixed(2)
            : '0';
        
        res.json({
            success: true,
            data: {
                eventId: id,
                eventName: event.name,
                totalSeats: event.total_seats,
                availableSeats: event.available_seats,
                soldSeats: event.total_seats - event.available_seats,
                soldPercentage: parseFloat(soldPercentage),
                ...stats
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Upload event image to Walrus
 */
export async function uploadEventImage(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }
        
        logger.info('Uploading image to Walrus', {
            filename: req.file.originalname,
            size: req.file.size
        });
        
        // Upload to Walrus
        const blobId = await walrusService.uploadImageToWalrus(req.file.buffer);
        const imageUrl = walrusService.getWalrusUrl(blobId);
        
        res.json({
            success: true,
            data: {
                blobId,
                imageUrl
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Sync event from blockchain
 */
export async function syncEvent(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        
        logger.info('Manually syncing event from chain', { id });
        
        const event = await eventService.syncEventFromChain(id);
        
        res.json({
            success: true,
            message: 'Event synced successfully',
            data: event
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Sync recent events from blockchain
 */
export async function syncRecentEvents(req: Request, res: Response, next: NextFunction) {
    try {
        const limit = parseInt(req.query.limit as string) || 50;
        
        logger.info('Syncing recent events from chain', { limit });
        
        const events = await eventService.syncRecentEvents(limit);
        
        res.json({
            success: true,
            message: `Synced ${events.length} events`,
            data: events
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Search events
 */
export async function searchEvents(req: Request, res: Response, next: NextFunction) {
    try {
        const { q } = req.query;
        
        if (!q || typeof q !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Search query (q) is required'
            });
        }
        
        const result = await eventService.getAllEvents({
            search: q,
            page: parseInt(req.query.page as string) || 1,
            limit: parseInt(req.query.limit as string) || 10
        });
        
        res.json({
            success: true,
            query: q,
            data: result.events,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
}

export default {
    getAllEvents,
    getEventById,
    getEventsByOrganizer,
    getUpcomingEvents,
    getEventStats,
    uploadEventImage,
    syncEvent,
    syncRecentEvents,
    searchEvents
};
