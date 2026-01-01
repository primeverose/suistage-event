/// SuiStage Event Management Contract
/// Role 2: Event Management System
module suistage::event {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use std::string::{Self, String};
    use sui::clock::{Self, Clock};

    // ==================== Error Codes ====================
    const ERROR_NOT_ORGANIZER: u64 = 1;
    const ERROR_EVENT_INACTIVE: u64 = 2;
    const ERROR_INVALID_DATE: u64 = 3;
    const ERROR_NO_SEATS_AVAILABLE: u64 = 4;
    const ERROR_INVALID_SEAT_COUNT: u64 = 5;

    // ==================== Structs ====================
    
    /// Event 主結構
    public struct Event has key, store {
        id: UID,
        name: String,
        description: String,
        venue: String,
        date: u64,                    // Unix timestamp
        organizer: address,
        total_seats: u64,
        available_seats: u64,
        price_per_seat: u64,
        image_url: String,            // Walrus Blob ID or URL
        is_active: bool,
        created_at: u64,
        updated_at: u64
    }

    /// Event Registry - 用於追蹤所有 Events
    public struct EventRegistry has key {
        id: UID,
        event_count: u64
    }

    // ==================== Events ====================
    
    /// Event Created 事件
    public struct EventCreated has copy, drop {
        event_id: ID,
        organizer: address,
        name: String,
        date: u64,
        venue: String,
        total_seats: u64,
        price_per_seat: u64
    }

    /// Event Updated 事件
    public struct EventUpdated has copy, drop {
        event_id: ID,
        name: String,
        date: u64,
        venue: String
    }

    /// Event Cancelled 事件
    public struct EventCancelled has copy, drop {
        event_id: ID,
        organizer: address
    }

    /// Seats Reserved 事件
    public struct SeatsReserved has copy, drop {
        event_id: ID,
        buyer: address,
        seat_count: u64,
        total_price: u64
    }

    // ==================== Init Function ====================
    
    /// 初始化函數 - 創建 Event Registry
    fun init(ctx: &mut TxContext) {
        let registry = EventRegistry {
            id: object::new(ctx),
            event_count: 0
        };
        transfer::share_object(registry);
    }

    #[test_only]
    /// 測試用的初始化函數
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }

    // ==================== Public Functions ====================
    
    /// 創建新活動
    public entry fun create_event(
        registry: &mut EventRegistry,
        name: vector<u8>,
        description: vector<u8>,
        venue: vector<u8>,
        date: u64,
        total_seats: u64,
        price_per_seat: u64,
        image_url: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);
        
        // 驗證日期
        assert!(date > current_time, ERROR_INVALID_DATE);
        
        let event_uid = object::new(ctx);
        let event_id = object::uid_to_inner(&event_uid);
        
        let event = Event {
            id: event_uid,
            name: string::utf8(name),
            description: string::utf8(description),
            venue: string::utf8(venue),
            date,
            organizer: tx_context::sender(ctx),
            total_seats,
            available_seats: total_seats,
            price_per_seat,
            image_url: string::utf8(image_url),
            is_active: true,
            created_at: current_time,
            updated_at: current_time
        };
        
        // 更新 Registry
        registry.event_count = registry.event_count + 1;
        
        // Emit event
        event::emit(EventCreated {
            event_id,
            organizer: tx_context::sender(ctx),
            name: event.name,
            date,
            venue: event.venue,
            total_seats,
            price_per_seat
        });
        
        // Share object - 讓所有人都可以讀取
        transfer::share_object(event);
    }

    /// 更新活動資訊
    public entry fun update_event(
        event: &mut Event,
        name: vector<u8>,
        description: vector<u8>,
        venue: vector<u8>,
        date: u64,
        image_url: vector<u8>,
        clock: &Clock,
        ctx: &TxContext
    ) {
        // 驗證只有主辦方可以更新
        assert!(event.organizer == tx_context::sender(ctx), ERROR_NOT_ORGANIZER);
        assert!(event.is_active, ERROR_EVENT_INACTIVE);
        
        let current_time = clock::timestamp_ms(clock);
        assert!(date > current_time, ERROR_INVALID_DATE);
        
        event.name = string::utf8(name);
        event.description = string::utf8(description);
        event.venue = string::utf8(venue);
        event.date = date;
        event.image_url = string::utf8(image_url);
        event.updated_at = current_time;
        
        event::emit(EventUpdated {
            event_id: object::uid_to_inner(&event.id),
            name: event.name,
            date,
            venue: event.venue
        });
    }

    /// 取消活動
    public entry fun cancel_event(
        event: &mut Event,
        ctx: &TxContext
    ) {
        assert!(event.organizer == tx_context::sender(ctx), ERROR_NOT_ORGANIZER);
        assert!(event.is_active, ERROR_EVENT_INACTIVE);
        
        event.is_active = false;
        
        event::emit(EventCancelled {
            event_id: object::uid_to_inner(&event.id),
            organizer: event.organizer
        });
    }

    /// 預留座位 (當票券被購買時調用)
    public entry fun reserve_seats(
        event: &mut Event,
        seat_count: u64,
        clock: &Clock,
        ctx: &TxContext
    ) {
        assert!(event.is_active, ERROR_EVENT_INACTIVE);
        assert!(seat_count > 0, ERROR_INVALID_SEAT_COUNT);
        assert!(event.available_seats >= seat_count, ERROR_NO_SEATS_AVAILABLE);
        
        event.available_seats = event.available_seats - seat_count;
        event.updated_at = clock::timestamp_ms(clock);
        
        let total_price = event.price_per_seat * seat_count;
        
        event::emit(SeatsReserved {
            event_id: object::uid_to_inner(&event.id),
            buyer: tx_context::sender(ctx),
            seat_count,
            total_price
        });
    }

    /// 釋放座位 (當票券被退票時調用)
    public entry fun release_seats(
        event: &mut Event,
        seat_count: u64,
        clock: &Clock,
        ctx: &TxContext
    ) {
        assert!(event.organizer == tx_context::sender(ctx), ERROR_NOT_ORGANIZER);
        
        event.available_seats = event.available_seats + seat_count;
        event.updated_at = clock::timestamp_ms(clock);
    }

    // ==================== View Functions ====================
    
    /// 獲取活動基本資訊
    public fun get_event_info(event: &Event): (String, String, u64, u64, u64, bool) {
        (
            event.name,
            event.venue,
            event.date,
            event.available_seats,
            event.price_per_seat,
            event.is_active
        )
    }

    /// 獲取活動詳細資訊
    public fun get_event_details(event: &Event): (
        String,  // name
        String,  // description
        String,  // venue
        u64,     // date
        address, // organizer
        u64,     // total_seats
        u64,     // available_seats
        u64,     // price_per_seat
        String,  // image_url
        bool,    // is_active
        u64,     // created_at
        u64      // updated_at
    ) {
        (
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
        )
    }

    /// 獲取活動 ID
    public fun get_event_id(event: &Event): ID {
        object::uid_to_inner(&event.id)
    }

    /// 檢查座位是否充足
    public fun check_seats_available(event: &Event, seat_count: u64): bool {
        event.is_active && event.available_seats >= seat_count
    }
}
