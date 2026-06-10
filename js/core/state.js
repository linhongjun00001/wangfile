/**
 * State - 全局状态管理
 * 使用Proxy实现响应式状态
 */
class State {
    constructor() {
        this.data = {
            // 当前用户状态
            isAdmin: false,
            user: null,

            // 当前选中的园区/楼层
            currentFloorId: null,
            currentFloor: null,

            // 数据列表
            floors: [],
            areas: [],
            seats: [],

            // 连接状态
            isOnline: false,
            isSyncing: false,
            lastSyncTime: null,

            // 应用状态
            isAddMode: false,
            isEditMode: false,
            selectedSeatId: null,
            searchQuery: '',
            searchResults: [],

            // 视图状态
            zoom: 1,
            pan: { x: 0, y: 0 },
            is3D: false
        };

        this.listeners = {};
        this.proxy = this.createProxy(this.data);
    }

    createProxy(target, path = '') {
        const self = this;
        return new Proxy(target, {
            set(obj, prop, value) {
                const oldValue = obj[prop];
                obj[prop] = value;
                const fullPath = path ? `${path}.${prop}` : prop;
                self.notify(fullPath, value, oldValue);
                // 也通知根路径监听器
                if (path) {
                    self.notify(path, obj, obj);
                }
                return true;
            },
            get(obj, prop) {
                if (typeof obj[prop] === 'object' && obj[prop] !== null) {
                    const fullPath = path ? `${path}.${prop}` : prop;
                    return self.createProxy(obj[prop], fullPath);
                }
                return obj[prop];
            }
        });
    }

    notify(path, newValue, oldValue) {
        if (this.listeners[path]) {
            this.listeners[path].forEach(callback => {
                try {
                    callback(newValue, oldValue, path);
                } catch (error) {
                    console.error(`State listener error for ${path}:`, error);
                }
            });
        }
        // 通知通配符监听器
        if (this.listeners['*']) {
            this.listeners['*'].forEach(callback => {
                try {
                    callback(path, newValue, oldValue);
                } catch (error) {
                    console.error(`State wildcard listener error:`, error);
                }
            });
        }
    }

    watch(path, callback) {
        if (!this.listeners[path]) {
            this.listeners[path] = [];
        }
        this.listeners[path].push(callback);
        // 立即返回当前值
        const currentValue = this.get(path);
        callback(currentValue, undefined, path);
        return () => this.unwatch(path, callback);
    }

    unwatch(path, callback) {
        if (!this.listeners[path]) return;
        this.listeners[path] = this.listeners[path].filter(cb => cb !== callback);
    }

    get(path) {
        const keys = path.split('.');
        let value = this.data;
        for (const key of keys) {
            if (value === undefined || value === null) return undefined;
            value = value[key];
        }
        return value;
    }

    set(path, value) {
        const keys = path.split('.');
        let target = this.data;
        for (let i = 0; i < keys.length - 1; i++) {
            if (target[keys[i]] === undefined) {
                target[keys[i]] = {};
            }
            target = target[keys[i]];
        }
        target[keys[keys.length - 1]] = value;
        this.notify(path, value, undefined);
    }

    // 批量更新
    batchUpdate(updates) {
        Object.entries(updates).forEach(([path, value]) => {
            this.set(path, value);
        });
    }

    // 获取响应式代理
    get state() {
        return this.proxy;
    }

    // 获取原始数据（用于序列化）
    get raw() {
        return JSON.parse(JSON.stringify(this.data));
    }
}

// 全局状态实例
const appState = new State();
