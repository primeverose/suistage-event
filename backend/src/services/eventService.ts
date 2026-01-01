import { query, transaction } from './database';
import { getEventFromChain, parseEventContent, queryEvents, EVENT_TYPES } from './suiClient';
import { logger } from '../utils/logger';

export interface Event {
    id: string;
    name: string;
    description: string;
    venue: string;
    date: number;
    organizer: string;
    total_seats: number;
    available_seats: number;
    price_per_seat: number;
    image_url: string;
    is_active: boolean;
    created_at: number;
    updated_at: number;
}

/**
 * Get all events with pagination and filters
 */
export async function getAllEvents(options: {
    page?: number;
    limit?: number;
    search?: string;
    organizer?: string;
    isActive?: boolean;
    upcoming?: boolean;
}) {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const offset = (page - 1) * limit;
    
    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;
    
    // Build WHERE clause
    if (options.search) {
        whereConditions.push(`(name ILIKE $${paramIndex} OR venue ILIKE $${paramIndex})`);
        params.push(`%${options.search}%`);
        paramIndex++;
    }
    
    if (options.organizer) {
        whereConditions.push(`organizer = $${paramIndex}`);
        params.push(options.organizer);
        paramIndex++;
    }
    
    if (options.isActive !== undefined) {
        whereConditions.push(`is_active = $${paramIndex}`);
        params.push(options.isActive);
        paramIndex++;
    }
    
    if (options.upcoming) {
        whereConditions.push(`date > EXTRACT(EPOCH FROM NOW()) * 1000`);
    }
    
    const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';
    
    // Get total count
    const countQuery = `SELECT COUNT(*) FROM events ${whereClause}`;
    const countResult = await query(countQuery, params);
    const total = parseInt((countResult.rows[0] as any).count || (countResult.rows[0] as any)['COUNT(*)'] || '0');
    
    // Get events
    const eventsQuery = `
        SELECT * FROM events 
        ${whereClause}
        ORDER BY date DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const eventsResult = await query(eventsQuery, [...params, limit, offset]);
    
    return {
        events: eventsResult.rows,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
}

/**
 * Get event by ID (from database)
 */
export async function getEventById(eventId: string): Promise<Event | null> {
    const result = await query('SELECT * FROM events WHERE id = $1', [eventId]);
    return (result.rows[0] as Event) || null;
}

/**
 * Sync event from blockchain to database
 */
export async function syncEventFromChain(eventId: string): Promise<Event> {
    try {
        // Fetch from blockchain
        const eventData = await getEventFromChain(eventId);
        const fields = parseEventContent(eventData);
        
        // Prepare event data
        const event = {
            id: eventId,
            name: fields.name,
            description: fields.description,
            venue: fields.venue,
            date: parseInt(fields.date),
            organizer: fields.organizer,
            total_seats: parseInt(fields.total_seats),
            available_seats: parseInt(fields.available_seats),
            price_per_seat: parseInt(fields.price_per_seat),
            image_url: fields.image_url,
            is_active: fields.is_active,
            created_at: parseInt(fields.created_at),
            updated_at: parseInt(fields.updated_at)
        };
        
        // Upsert to database
        await upsertEvent(event);
        
        logger.info('Event synced from chain', { eventId });
        return event;
    } catch (error) {
        logger.error('Failed to sync event from chain', { eventId, error });
        throw error;
    }
}

/**
 * Upsert event to database
 */
export async function upsertEvent(event: Event) {
    const upsertQuery = `
        INSERT INTO events (
            id, name, description, venue, date, organizer,
            total_seats, available_seats, price_per_seat,
            image_url, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            venue = EXCLUDED.venue,
            date = EXCLUDED.date,
            available_seats = EXCLUDED.available_seats,
            price_per_seat = EXCLUDED.price_per_seat,
            image_url = EXCLUDED.image_url,
            is_active = EXCLUDED.is_active,
            updated_at = EXCLUDED.updated_at,
            synced_at = CURRENT_TIMESTAMP
        RETURNING *
    `;
    
    const result = await query(upsertQuery, [
        event.id,
        event.name,
        event.description,
        event.venue,
        event.date,
        event.organizer,
        event.total_seats,
        event.available_seats,
        event.price_per_seat,
        event.image_url,
        event.is_active,
        event.created_at,
        event.updated_at
    ]);
    
    return result.rows[0];
}

/**
 * Record event transaction
 */
export async function recordEventTransaction(data: {
    eventId: string;
    txDigest: string;
    eventType: string;
    sender: string;
    timestamp: number;
    data?: any;
}) {
    const insertQuery = `
        INSERT INTO event_transactions (
            event_id, tx_digest, event_type, sender, timestamp, data
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (tx_digest, event_type) DO NOTHING
        RETURNING *
    `;
    
    const result = await query(insertQuery, [
        data.eventId,
        data.txDigest,
        data.eventType,
        data.sender,
        data.timestamp,
        JSON.stringify(data.data || {})
    ]);
    
    return result.rows[0];
}

/**
 * Record seat reservation
 */
export async function recordSeatReservation(data: {
    eventId: string;
    buyer: string;
    seatCount: number;
    totalPrice: number;
    txDigest: string;
    reservedAt: number;
}) {
    const insertQuery = `
        INSERT INTO seat_reservations (
            event_id, buyer, seat_count, total_price, tx_digest, reserved_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
    `;
    
    const result = await query(insertQuery, [
        data.eventId,
        data.buyer,
        data.seatCount,
        data.totalPrice,
        data.txDigest,
        data.reservedAt
    ]);
    
    return result.rows[0];
}

/**
 * Get events by organizer
 */
export async function getEventsByOrganizer(organizerAddress: string) {
    const result = await query(
        'SELECT * FROM events WHERE organizer = $1 ORDER BY created_at DESC',
        [organizerAddress]
    );
    return result.rows;
}

/**
 * Get upcoming events
 */
export async function getUpcomingEvents(limit: number = 10) {
    const result = await query(
        `SELECT * FROM events 
         WHERE is_active = TRUE AND date > EXTRACT(EPOCH FROM NOW()) * 1000
         ORDER BY date ASC
         LIMIT $1`,
        [limit]
    );
    return result.rows;
}

/**
 * Get event statistics
 */
export async function getEventStats(eventId: string) {
    const queries = {
        ticketsSold: `
            SELECT COALESCE(SUM(seat_count), 0) as tickets_sold
            FROM seat_reservations
            WHERE event_id = $1
        `,
        revenue: `
            SELECT COALESCE(SUM(total_price), 0) as total_revenue
            FROM seat_reservations
            WHERE event_id = $1
        `,
        uniqueBuyers: `
            SELECT COUNT(DISTINCT buyer) as unique_buyers
            FROM seat_reservations
            WHERE event_id = $1
        `
    };
    
    const [ticketsSold, revenue, uniqueBuyers] = await Promise.all([
        query(queries.ticketsSold, [eventId]),
        query(queries.revenue, [eventId]),
        query(queries.uniqueBuyers, [eventId])
    ]);
    
    return {
        ticketsSold: parseInt((ticketsSold.rows[0] as any).tickets_sold || '0'),
        totalRevenue: parseInt((revenue.rows[0] as any).total_revenue || '0'),
        uniqueBuyers: parseInt((uniqueBuyers.rows[0] as any).unique_buyers || '0')
    };
}

/**
 * Sync all recent events from blockchain
 */
export async function syncRecentEvents(limit: number = 50) {
    try {
        const events = await queryEvents(EVENT_TYPES.EVENT_CREATED, undefined, limit);
        
        const syncedEvents = [];
        for (const event of events.data) {
            try {
                const parsedEvent = event.parsedJson as any;
                const eventId = parsedEvent.event_id;
                
                const syncedEvent = await syncEventFromChain(eventId);
                syncedEvents.push(syncedEvent);
            } catch (error) {
                logger.error('Failed to sync individual event', { error });
            }
        }
        
        logger.info(`Synced ${syncedEvents.length} events from chain`);
        return syncedEvents;
    } catch (error) {
        logger.error('Failed to sync recent events', { error });
        throw error;
    }
}

export default {
    getAllEvents,
    getEventById,
    syncEventFromChain,
    upsertEvent,
    recordEventTransaction,
    recordSeatReservation,
    getEventsByOrganizer,
    getUpcomingEvents,
    getEventStats,
    syncRecentEvents
};
