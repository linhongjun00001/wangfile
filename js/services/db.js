/**
 * DBService - IndexedDB本地存储服务
 */
class DBService {
    constructor() {
        this.db = null;
        this.isReady = false;
        this.initPromise = null;
    }

    /**
     * 初始化数据库
     */
    async init() {
        if (this.initPromise) return this.initPromise;
        if (this.isReady) return this.db;

        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(CONFIG.DB_NAME, CONFIG.DB_VERSION);

            request.onerror = () => {
                console.error('IndexedDB open failed:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                this.isReady = true;
                console.log('IndexedDB initialized');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // 楼层/园区表
                if (!db.objectStoreNames.contains('floors')) {
                    const floorsStore = db.createObjectStore('floors', { keyPath: 'id' });
                    floorsStore.createIndex('name', 'name', { unique: false });
                    floorsStore.createIndex('sort_order', 'sort_order', { unique: false });
                }

                // 区域表
                if (!db.objectStoreNames.contains('areas')) {
                    const areasStore = db.createObjectStore('areas', { keyPath: 'id' });
                    areasStore.createIndex('floor_id', 'floor_id', { unique: false });
                    areasStore.createIndex('name', 'name', { unique: false });
                }

                // 工位表
                if (!db.objectStoreNames.contains('seats')) {
                    const seatsStore = db.createObjectStore('seats', { keyPath: 'id' });
                    seatsStore.createIndex('floor_id', 'floor_id', { unique: false });
                    seatsStore.createIndex('area_id', 'area_id', { unique: false });
                    seatsStore.createIndex('status', 'status', { unique: false });
                    seatsStore.createIndex('occupant_name', 'occupant_name', { unique: false });
                }

                // 同步队列表
                if (!db.objectStoreNames.contains('syncQueue')) {
                    const queueStore = db.createObjectStore('syncQueue', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    queueStore.createIndex('table', 'table', { unique: false });
                    queueStore.createIndex('operation', 'operation', { unique: false });
                    queueStore.createIndex('status', 'status', { unique: false });
                }

                // 元数据表
                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata', { keyPath: 'key' });
                }
            };
        });

        return this.initPromise;
    }

    /**
     * 获取存储对象
     */
    getStore(storeName, mode = 'readonly') {
        if (!this.db) throw new Error('Database not initialized');
        const transaction = this.db.transaction(storeName, mode);
        return transaction.objectStore(storeName);
    }

    /**
     * 添加或更新数据
     */
    async put(storeName, data) {
        return new Promise((resolve, reject) => {
            try {
                const store = this.getStore(storeName, 'readwrite');
                const request = store.put(data);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 批量添加或更新
     */
    async putAll(storeName, items) {
        const results = [];
        for (const item of items) {
            try {
                const result = await this.put(storeName, item);
                results.push({ success: true, result });
            } catch (error) {
                results.push({ success: false, error });
            }
        }
        return results;
    }

    /**
     * 获取单条数据
     */
    async get(storeName, id) {
        return new Promise((resolve, reject) => {
            try {
                const store = this.getStore(storeName, 'readonly');
                const request = store.get(id);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 获取所有数据
     */
    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            try {
                const store = this.getStore(storeName, 'readonly');
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 通过索引查询
     */
    async getByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            try {
                const store = this.getStore(storeName, 'readonly');
                const index = store.index(indexName);
                const request = index.getAll(value);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 删除数据
     */
    async delete(storeName, id) {
        return new Promise((resolve, reject) => {
            try {
                const store = this.getStore(storeName, 'readwrite');
                const request = store.delete(id);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 清空表
     */
    async clear(storeName) {
        return new Promise((resolve, reject) => {
            try {
                const store = this.getStore(storeName, 'readwrite');
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 添加同步队列项
     */
    async addToSyncQueue(table, operation, data) {
        const queueItem = {
            table,
            operation,
            data,
            status: 'pending',
            retryCount: 0,
            createdAt: new Date().toISOString()
        };
        return this.put('syncQueue', queueItem);
    }

    /**
     * 获取待同步的队列项
     */
    async getPendingSyncItems() {
        return new Promise((resolve, reject) => {
            try {
                const store = this.getStore('syncQueue', 'readonly');
                const index = store.index('status');
                const request = index.getAll('pending');
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 更新同步队列项状态
     */
    async updateSyncQueueItem(id, updates) {
        const item = await this.get('syncQueue', id);
        if (item) {
            Object.assign(item, updates);
            return this.put('syncQueue', item);
        }
    }

    /**
     * 删除已完成的同步队列项
     */
    async cleanSyncQueue() {
        const allItems = await this.getAll('syncQueue');
        const completedItems = allItems.filter(item => item.status === 'completed');
        for (const item of completedItems) {
            await this.delete('syncQueue', item.id);
        }
        return completedItems.length;
    }

    /**
     * 设置元数据
     */
    async setMetadata(key, value) {
        return this.put('metadata', { key, value, updatedAt: new Date().toISOString() });
    }

    /**
     * 获取元数据
     */
    async getMetadata(key) {
        const result = await this.get('metadata', key);
        return result ? result.value : null;
    }

    /**
     * 初始化默认数据
     */
    async initDefaultData() {
        const existingFloors = await this.getAll('floors');
        if (existingFloors.length === 0) {
            console.log('Initializing default data...');
            for (const floor of CONFIG.DEFAULT_FLOORS) {
                await this.put('floors', floor);
            }
            for (const area of CONFIG.DEFAULT_AREAS) {
                await this.put('areas', area);
            }
            // 添加一些示例工位
            const demoSeats = this.generateDemoSeats();
            for (const seat of demoSeats) {
                await this.put('seats', seat);
            }
            console.log('Default data initialized');
        }
    }

    /**
     * 生成示例工位数据
     */
    generateDemoSeats() {
        const seats = [];
        const departments = ['研发部', '产品部', '设计部'];
        const names = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十'];

        // 杭州办公区 - 研发部工位
        for (let i = 0; i < 8; i++) {
            seats.push({
                id: `seat-hz-${i}`,
                floor_id: 'floor-hangzhou',
                area_id: 'area-dev',
                seat_number: `A${String(i + 1).padStart(2, '0')}`,
                x_position: 100 + (i % 4) * 80,
                y_position: 100 + Math.floor(i / 4) * 80,
                width: 60,
                height: 60,
                status: i < 5 ? 'occupied' : 'available',
                occupant_name: i < 5 ? names[i] : null,
                occupant_department: i < 5 ? departments[0] : null,
                occupant_phone: i < 5 ? `1380013${String(i).padStart(4, '0')}` : null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        }

        // 杭州办公区 - 产品部工位
        for (let i = 0; i < 4; i++) {
            seats.push({
                id: `seat-hz-product-${i}`,
                floor_id: 'floor-hangzhou',
                area_id: 'area-product',
                seat_number: `B${String(i + 1).padStart(2, '0')}`,
                x_position: 500 + i * 80,
                y_position: 100,
                width: 60,
                height: 60,
                status: i < 2 ? 'occupied' : 'available',
                occupant_name: i < 2 ? names[i + 5] : null,
                occupant_department: i < 2 ? departments[1] : null,
                occupant_phone: i < 2 ? `1390013${String(i).padStart(4, '0')}` : null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        }

        return seats;
    }
}

// 全局数据库服务实例
const dbService = new DBService();
