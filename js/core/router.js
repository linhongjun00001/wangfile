/**
 * Router - Hash路由管理
 * 适配GitHub Pages静态托管
 */
class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = '';
        this.beforeEach = null;
        this.afterEach = null;

        // 监听hash变化
        window.addEventListener('hashchange', () => this.handleRoute());
        window.addEventListener('load', () => this.handleRoute());
    }

    register(path, handler) {
        this.routes[path] = handler;
        return this;
    }

    beforeEachHook(hook) {
        this.beforeEach = hook;
        return this;
    }

    afterEachHook(hook) {
        this.afterEach = hook;
        return this;
    }

    handleRoute() {
        const hash = window.location.hash || '#/';
        const path = hash.split('?')[0];

        if (this.beforeEach) {
            const result = this.beforeEach(path, this.currentRoute);
            if (result === false) return;
        }

        this.currentRoute = path;

        // 查找匹配的路由
        const handler = this.routes[path] || this.routes['#/'];
        if (handler) {
            handler(path);
        }

        if (this.afterEach) {
            this.afterEach(path, this.currentRoute);
        }

        // 触发路由变化事件
        eventBus.emit('route:changed', { path, params: this.getParams() });
    }

    navigate(path) {
        window.location.hash = path;
    }

    getParams() {
        const hash = window.location.hash || '#/';
        const queryIndex = hash.indexOf('?');
        if (queryIndex === -1) return {};

        const queryString = hash.substring(queryIndex + 1);
        const params = {};
        queryString.split('&').forEach(pair => {
            const [key, value] = pair.split('=');
            if (key) {
                params[decodeURIComponent(key)] = decodeURIComponent(value || '');
            }
        });
        return params;
    }

    getParam(key) {
        return this.getParams()[key];
    }

    back() {
        window.history.back();
    }
}

// 全局路由实例
const router = new Router();
