import { Router } from 'express';
import multer from 'multer';
import * as eventController from '../controllers/eventController';
import { validateEventQuery, validateEventId } from '../middleware/validation';

const router = Router();

// Configure multer for file upload
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPG, PNG, GIF, WebP allowed.'));
        }
    }
});

// ==================== Event Routes ====================

/**
 * GET /api/events
 * Get all events with pagination and filters
 * 
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 10)
 * - search: string (search in name and venue)
 * - organizer: string (Sui address)
 * - is_active: boolean
 * - upcoming: boolean (only future events)
 */
router.get('/', validateEventQuery, eventController.getAllEvents);

/**
 * GET /api/events/upcoming
 * Get upcoming events
 * 
 * Query params:
 * - limit: number (default: 10)
 */
router.get('/upcoming', eventController.getUpcomingEvents);

/**
 * GET /api/events/search
 * Search events
 * 
 * Query params:
 * - q: string (required)
 * - page: number
 * - limit: number
 */
router.get('/search', eventController.searchEvents);

/**
 * GET /api/events/organizer/:address
 * Get events by organizer address
 */
router.get('/organizer/:address', eventController.getEventsByOrganizer);

/**
 * GET /api/events/:id
 * Get event by ID
 */
router.get('/:id', validateEventId, eventController.getEventById);

/**
 * GET /api/events/:id/stats
 * Get event statistics
 */
router.get('/:id/stats', validateEventId, eventController.getEventStats);

/**
 * POST /api/events/upload-image
 * Upload event image to Walrus
 * 
 * Body: multipart/form-data
 * - image: file (required)
 */
router.post('/upload-image', upload.single('image'), eventController.uploadEventImage);

/**
 * POST /api/events/:id/sync
 * Manually sync event from blockchain
 */
router.post('/:id/sync', validateEventId, eventController.syncEvent);

/**
 * POST /api/events/sync-recent
 * Sync recent events from blockchain
 * 
 * Query params:
 * - limit: number (default: 50)
 */
router.post('/sync-recent', eventController.syncRecentEvents);

export { router as eventRoutes };
export default router;
