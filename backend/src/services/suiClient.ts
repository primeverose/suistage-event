import { SuiClient, SuiEventFilter } from '@mysten/sui/client';
import { config } from '../config';
import { logger } from '../utils/logger';

// Initialize Sui Client
export const suiClient = new SuiClient({ url: config.sui.rpcUrl });

// Event types from the contract
export const EVENT_TYPES = {
    EVENT_CREATED: `${config.sui.packageId}::event::EventCreated`,
    EVENT_UPDATED: `${config.sui.packageId}::event::EventUpdated`,
    EVENT_CANCELLED: `${config.sui.packageId}::event::EventCancelled`,
    SEATS_RESERVED: `${config.sui.packageId}::event::SeatsReserved`
};

/**
 * Get Event object from Sui blockchain
 */
export async function getEventFromChain(eventId: string) {
    try {
        const event = await suiClient.getObject({
            id: eventId,
            options: {
                showContent: true,
                showOwner: true,
                showType: true
            }
        });
        
        return event;
    } catch (error) {
        logger.error('Error fetching event from chain', { eventId, error });
        throw error;
    }
}

/**
 * Get multiple events from chain
 */
export async function getEventsFromChain(eventIds: string[]) {
    try {
        const events = await suiClient.multiGetObjects({
            ids: eventIds,
            options: {
                showContent: true,
                showOwner: true,
                showType: true
            }
        });
        
        return events;
    } catch (error) {
        logger.error('Error fetching multiple events', { error });
        throw error;
    }
}

/**
 * Subscribe to event creation events
 */
export async function subscribeToEventCreation(callback: (event: any) => void) {
    const filter: SuiEventFilter = {
        MoveEventType: EVENT_TYPES.EVENT_CREATED
    };
    
    try {
        const unsubscribe = await suiClient.subscribeEvent({
            filter,
            onMessage: (event) => {
                logger.info('New event created', { event: event.parsedJson });
                callback(event);
            }
        });
        
        logger.info('✅ Subscribed to EventCreated events');
        return unsubscribe;
    } catch (error) {
        logger.error('Failed to subscribe to events', { error });
        throw error;
    }
}

/**
 * Query events by type
 */
export async function queryEvents(eventType: string, cursor?: string, limit: number = 50) {
    try {
        const filter: SuiEventFilter = {
            MoveEventType: eventType
        };

        const result = await suiClient.queryEvents({
            query: filter,
            cursor: cursor as any || null,
            limit,
            order: 'descending'
        });

        return result;
    } catch (error) {
        logger.error('Error querying events', { eventType, error });
        throw error;
    }
}

/**
 * Get transaction details
 */
export async function getTransaction(digest: string) {
    try {
        const tx = await suiClient.getTransactionBlock({
            digest,
            options: {
                showEffects: true,
                showEvents: true,
                showInput: true,
                showObjectChanges: true
            }
        });
        
        return tx;
    } catch (error) {
        logger.error('Error fetching transaction', { digest, error });
        throw error;
    }
}

/**
 * Get all events owned by an address (for organizer queries)
 */
export async function getEventsByOrganizer(organizerAddress: string) {
    try {
        const objects = await suiClient.getOwnedObjects({
            owner: organizerAddress,
            filter: {
                StructType: `${config.sui.packageId}::event::Event`
            },
            options: {
                showContent: true,
                showType: true
            }
        });
        
        return objects.data;
    } catch (error) {
        logger.error('Error fetching events by organizer', { organizerAddress, error });
        throw error;
    }
}

/**
 * Parse event content from chain data
 */
export function parseEventContent(eventData: any) {
    if (!eventData || !eventData.data || !eventData.data.content) {
        throw new Error('Invalid event data structure');
    }
    
    const content = eventData.data.content;
    if (content.dataType !== 'moveObject') {
        throw new Error('Event is not a Move object');
    }
    
    return content.fields;
}

/**
 * Check if contract is deployed and accessible
 */
export async function verifyContractDeployment() {
    try {
        // Try to get the Event Registry object
        const registry = await suiClient.getObject({
            id: config.sui.eventRegistryId,
            options: { showContent: true }
        });
        
        if (registry.data) {
            logger.info('✅ Contract verified on chain');
            return true;
        }
        
        logger.warn('⚠️  Event Registry not found');
        return false;
    } catch (error) {
        logger.error('❌ Failed to verify contract', { error });
        return false;
    }
}

export default suiClient;
