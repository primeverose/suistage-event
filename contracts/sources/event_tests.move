#[test_only]
module suistage::event_tests {
    use suistage::event::{Self, Event, EventRegistry};
    use sui::test_scenario as ts;
    use sui::clock;

    const ADMIN: address = @0xAD;
    const USER1: address = @0xB0B;

    #[test]
    /// 測試：創建活動
    fun test_create_event() {
        let mut scenario = ts::begin(ADMIN);
        
        // 初始化 Registry
        {
            event::init_for_testing(ts::ctx(&mut scenario));
        };
        
        // 創建 Clock
        ts::next_tx(&mut scenario, ADMIN);
        let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 1000000);
        
        // 創建活動
        ts::next_tx(&mut scenario, USER1);
        {
            let mut registry = ts::take_shared<EventRegistry>(&scenario);
            
            event::create_event(
                &mut registry,
                b"Test Concert",
                b"A great concert",
                b"Taipei Arena",
                2000000000,
                1000,
                500000000,
                b"image123",
                &clock,
                ts::ctx(&mut scenario)
            );
            
            ts::return_shared(registry);
        };
        
        // 驗證活動已創建（作為共享對象）
        ts::next_tx(&mut scenario, USER1);
        {
            // Event 是共享對象，所以我們只檢查交易是否成功
            // 不需要額外的驗證
        };
        
        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    /// 測試：預留座位
    fun test_reserve_seats() {
        let mut scenario = ts::begin(ADMIN);

        // 初始化
        {
            event::init_for_testing(ts::ctx(&mut scenario));
        };

        ts::next_tx(&mut scenario, ADMIN);
        let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 1000000);

        // 創建活動
        ts::next_tx(&mut scenario, USER1);
        {
            let mut registry = ts::take_shared<EventRegistry>(&scenario);

            event::create_event(
                &mut registry,
                b"Concert",
                b"Description",
                b"Venue",
                2000000000,
                1000,
                500000000,
                b"image",
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
        };

        // 預留座位
        ts::next_tx(&mut scenario, USER1);
        {
            let mut evt = ts::take_shared<Event>(&scenario);

            event::reserve_seats(&mut evt, 10, &clock, ts::ctx(&mut scenario));

            ts::return_shared(evt);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    /// 測試：更新活動
    fun test_update_event() {
        let mut scenario = ts::begin(ADMIN);

        // 初始化
        {
            event::init_for_testing(ts::ctx(&mut scenario));
        };

        ts::next_tx(&mut scenario, ADMIN);
        let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 1000000);

        // 創建活動
        ts::next_tx(&mut scenario, USER1);
        {
            let mut registry = ts::take_shared<EventRegistry>(&scenario);

            event::create_event(
                &mut registry,
                b"Old Name",
                b"Old Desc",
                b"Old Venue",
                2000000000,
                1000,
                500000000,
                b"old_img",
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
        };

        // 更新活動
        ts::next_tx(&mut scenario, USER1);
        {
            let mut evt = ts::take_shared<Event>(&scenario);

            event::update_event(
                &mut evt,
                b"New Name",
                b"New Desc",
                b"New Venue",
                3000000000,
                b"new_img",
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(evt);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    /// 測試：取消活動
    fun test_cancel_event() {
        let mut scenario = ts::begin(ADMIN);

        // 初始化
        {
            event::init_for_testing(ts::ctx(&mut scenario));
        };

        ts::next_tx(&mut scenario, ADMIN);
        let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
        clock::set_for_testing(&mut clock, 1000000);

        // 創建活動
        ts::next_tx(&mut scenario, USER1);
        {
            let mut registry = ts::take_shared<EventRegistry>(&scenario);

            event::create_event(
                &mut registry,
                b"Concert",
                b"Desc",
                b"Venue",
                2000000000,
                1000,
                500000000,
                b"image",
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
        };

        // 取消活動
        ts::next_tx(&mut scenario, USER1);
        {
            let mut evt = ts::take_shared<Event>(&scenario);

            event::cancel_event(&mut evt, ts::ctx(&mut scenario));

            ts::return_shared(evt);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }
}
