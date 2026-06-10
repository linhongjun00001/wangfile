/**
 * SyncService - 数据同步服务
 * 管理本地数据与服务器数据的同步
 */
class SyncService {
    constructor() {
        this.syncTimer = null;
        this.isSyncing = false;
        this.retryCount = 0;
    }

    /**
     * 初始化同步服务
     */
    async init() {
        // 启动定时同步
        this.startAutoSync();

        // 监听实时数据变化
        eventBus.on('realtime:change', (data) => {
            this.handleRealtimeChange(data);
        });

        console.log('Sync service initialized');
    }

    /**
     * 启动自动同步
     */
    startAutoSync() {
        this.stopAutoSync();
        this.syncTimer = setInterval(() => {
            this.sync();
        }, CONFIG.SYNC_INTERVAL);
    }

    /**
     * 停止自动同步
     */
    stopAutoSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
        }
    }

    /**
     * 执行同步
     */
    async sync() {
        if (this.isSyncing) return;
        
        // 如果Supabase未连接，尝试初始化
        if (!supabaseService.isConnected) {
            const connected = await supabaseService.init();
            if (!connected) {
                appState.set('isOnline', false);
                appState.set('isSyncing', false);
                return;
            }
        }

        this.isSyncing = true;
        appState.set('isSyncing', true);
        eventBus.emit('sync:start');

        try {
            // 1. 先推送本地待同步的数据到服务器
            await this.pushLocalChanges();

            // 2. 从服务器拉取最新数据
            await this.pullServerData();

            // 3. 清理已完成的同步队列
            await dbService.cleanSyncQueue();

            appState.set('lastSyncTime', new Date().toISOString());
            appState.set('isOnline', true);
            this.retryCount = 0;

            eventBus.emit('sync:success', { timestamp: appState.get('lastSyncTime') });
        } catch (error) {
            console.error('Sync failed:', error);
            this.retryCount++;

            if (this.retryCount >= CONFIG.SYNC_MAX_RETRIES) {
                appState.set('isOnline', false);
            }

            eventBus.emit('sync:error', { error, retryCount: this.retryCount });
        } finally {
            this.isSyncing = false;
            appState.set('isSyncing', false);
        }
    }

    /**
     * 推送本地变更到服务器
     */
    async pushLocalChanges() {
        const pendingItems = await dbService.getPendingSyncItems();

        for (const item of pendingItems) {
            try {
                await this.processSyncItem(item);
                await dbService.updateSyncQueueItem(item.id, { status: 'completed' });
            } catch (error) {
                console.error('Push item failed:', error);
                const newRetryCount = (item.retryCount || 0) + 1;
                await dbService.updateSyncQueueItem(item.id, {
                    retryCount: newRetryCount,
                    lastError: error.message,
                    status: newRetryCount >= CONFIG.SYNC_MAX_RETRIES ? 'failed' : 'pending'
                });
            }
        }
    }

    /**
     * 处理单个同步项
     */
    async processSyncItem(item) {
        const { table, operation, data } = item;

        switch (operation) {
            case 'insert':
                if (table === 'seats') await supabaseService.createSeat(this.cleanForSync(data));
                if (table === 'areas') await supabaseService.createArea(this.cleanForSync(data));
                break;
            case 'update':
                if (table === 'seats') await supabaseService.updateSeat(data.id, this.cleanForSync(data));
                if (table === 'areas') await supabaseService.updateArea(data.id, this.cleanForSync(data));
                if (table === 'floors') await supabaseService.updateFloor(data.id, this.cleanFloorForSync(data));
                break;
            case 'delete':
                if (table === 'seats') await supabaseService.deleteSeat(data.id);
                if (table === 'areas') await supabaseService.deleteArea(data.id);
                break;
        }
    }

    /**
     * 清理数据：移除不适合同步到服务器的本地大字段
     */
    cleanForSync(data) {
        const clean = { ...data };
        // 移除 base64 大字段，避免超出 Supabase 行大小限制
        delete clean.bg_image_data;
        delete clean.avatar_data;
        return clean;
    }

    /**
     * 清理楼层数据用于同步：保留 bg_image_url，移除本地 base64
     */
    cleanFloorForSync(data) {
        const clean = { ...data };
        delete clean.bg_image_data;
        return clean;
    }

    /**
     * 从服务器拉取数据
     */
    async pullServerData() {
        let hasChanges = false;

        // 拉取楼层数据
        const serverFloors = await supabaseService.getFloors();
        if (serverFloors.length > 0) {
            const localFloors = await dbService.getAll('floors');
            const floorChanged = await this.mergeData('floors', serverFloors, localFloors);
            if (floorChanged) hasChanges = true;
        }

        // 拉取区域数据
        const serverAreas = await supabaseService.getAreas();
        if (serverAreas.length > 0) {
            const localAreas = await dbService.getAll('areas');
            const areaChanged = await this.mergeData('areas', serverAreas, localAreas);
            if (areaChanged) hasChanges = true;
        }

        // 拉取工位数据
        const serverSeats = await supabaseService.getSeats();
        if (serverSeats.length > 0) {
            const localSeats = await dbService.getAll('seats');
            const seatChanged = await this.mergeData('seats', serverSeats, localSeats);
            if (seatChanged) hasChanges = true;
        }

        // 如果有数据变化，刷新应用状态并触发重新渲染
        if (hasChanges) {
            await this.refreshStateData();
            eventBus.emit('data:updated');
        }
    }

    /**
     * 合并服务器数据和本地数据
     * @returns {boolean} 是否有数据变更
     */
    async mergeData(table, serverData, localData) {
        const localMap = new Map(localData.map(item => [item.id, item]));
        const serverMap = new Map(serverData.map(item => [item.id, item]));
        let changed = false;

        // 更新或添加服务器数据到本地
        for (const [id, serverItem] of serverMap) {
            const localItem = localMap.get(id);
            if (!localItem) {
                // 本地没有，添加
                await dbService.put(table, serverItem);
                changed = true;
            } else if (new Date(serverItem.updated_at) > new Date(localItem.updated_at)) {
                // 服务器数据更新，覆盖本地
                await dbService.put(table, serverItem);
                changed = true;
            }
        }

        return changed;
    }

    /**
     * 处理实时数据变化
     */
    async handleRealtimeChange({ table, payload }) {
        const { eventType, new: newRecord, old: oldRecord } = payload;

        switch (eventType) {
            case 'INSERT':
                await dbService.put(table.slice(0, -1), newRecord);
                break;
            case 'UPDATE':
                await dbService.put(table.slice(0, -1), newRecord);
                break;
            case 'DELETE':
                await dbService.delete(table.slice(0, -1), oldRecord.id);
                break;
        }

        // 更新状态
        this.refreshStateData();
    }

    /**
     * 添加本地变更到同步队列
     */
    async queueChange(table, operation, data) {
        // 先更新本地数据库
        if (operation === 'insert' || operation === 'update') {
            await dbService.put(table, data);
        } else if (operation === 'delete') {
            await dbService.delete(table, data.id);
        }

        // 添加到同步队列
        await dbService.addToSyncQueue(table, operation, data);

        // 立即尝试同步（如果在线）
        if (supabaseService.isConnected && !this.isSyncing) {
            this.sync();
        }

        // 更新状态
        this.refreshStateData();
    }

    /**
     * 刷新状态数据
     */
    async refreshStateData() {
        const floors = await dbService.getAll('floors');
        const areas = await dbService.getAll('areas');
        const seats = await dbService.getAll('seats');

        appState.batchUpdate({
            floors,
            areas,
            seats
        });
    }

    /**
     * 测试连接
     */
    async testConnection() {
        if (!supabaseService.isConnected) {
            const connected = await supabaseService.init();
            if (connected) {
                await this.sync();
            }
            return connected;
        }
        return true;
    }
}

// 全局同步服务实例
const syncService = new SyncService();
