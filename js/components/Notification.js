/**
 * Notification - 通知提示组件
 */
class Notification {
    constructor() {
        this.container = document.getElementById('notification-container');
        this.notifications = [];
    }

    /**
     * 显示通知
     */
    show(message, type = 'info', duration = CONFIG.NOTIFICATION_DURATION) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;

        const icon = this.getIcon(type);
        notification.innerHTML = `${icon}<span>${message}</span>`;

        this.container.appendChild(notification);
        this.notifications.push(notification);

        // 自动移除
        if (duration > 0) {
            setTimeout(() => {
                this.remove(notification);
            }, duration);
        }

        return notification;
    }

    /**
     * 移除通知
     */
    remove(notification) {
        if (!notification || !notification.parentNode) return;
        notification.classList.add('removing');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            this.notifications = this.notifications.filter(n => n !== notification);
        }, 300);
    }

    /**
     * 获取图标
     */
    getIcon(type) {
        const icons = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };
        return `<span style="font-weight:700">${icons[type] || icons.info}</span>`;
    }

    /**
     * 成功通知
     */
    success(message, duration) {
        return this.show(message, 'success', duration);
    }

    /**
     * 错误通知
     */
    error(message, duration) {
        return this.show(message, 'error', duration);
    }

    /**
     * 警告通知
     */
    warning(message, duration) {
        return this.show(message, 'warning', duration);
    }

    /**
     * 信息通知
     */
    info(message, duration) {
        return this.show(message, 'info', duration);
    }

    /**
     * 清除所有通知
     */
    clearAll() {
        this.notifications.forEach(n => this.remove(n));
    }
}

// 全局通知实例
const notification = new Notification();
