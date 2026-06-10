/**
 * BottomBar - 底部操作栏组件
 */
class BottomBar {
    constructor() {
        this.statusEl = document.getElementById('connection-status');
        this.syncInfoEl = document.getElementById('sync-info');

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupStateWatchers();
    }

    setupEventListeners() {
        // 刷新按钮
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.handleRefresh();
        });

        // 测试连接按钮
        document.getElementById('test-connection-btn').addEventListener('click', () => {
            this.handleTestConnection();
        });

        // 二维码按钮
        document.getElementById('qr-code-btn').addEventListener('click', () => {
            if (qrCodeModal) qrCodeModal.open();
        });

        // 上传底图按钮
        document.getElementById('upload-bg-btn').addEventListener('click', () => {
            if (imageUploader) imageUploader.open();
        });

        // 添加工位按钮
        document.getElementById('add-seat-btn').addEventListener('click', () => {
            this.toggleAddMode();
        });

        // 进入管理模式按钮
        document.getElementById('enter-admin-btn').addEventListener('click', () => {
            this.enterAdminMode();
        });

        // 退出管理模式按钮
        document.getElementById('exit-admin-btn').addEventListener('click', () => {
            this.exitAdminMode();
        });
    }

    setupStateWatchers() {
        // 监听连接状态
        appState.watch('isOnline', (isOnline) => {
            this.updateConnectionStatus(isOnline);
        });

        // 监听同步状态
        appState.watch('isSyncing', (isSyncing) => {
            if (isSyncing) {
                this.statusEl.className = 'connection-status syncing';
                this.statusEl.querySelector('.status-text').textContent = '同步中';
            } else {
                // 同步完成后，根据在线状态更新
                const isOnline = appState.get('isOnline');
                this.updateConnectionStatus(isOnline);
            }
        });

        // 监听最后同步时间
        appState.watch('lastSyncTime', (time) => {
            if (time) {
                const date = new Date(time);
                this.syncInfoEl.textContent = `上次同步: ${date.toLocaleTimeString()}`;
            }
        });

        // 监听管理员状态
        appState.watch('isAdmin', (isAdmin) => {
            this.updateAdminButtons(isAdmin);
        });

        // 监听添加模式
        appState.watch('isAddMode', (isAddMode) => {
            const addBtn = document.getElementById('add-seat-btn');
            if (isAddMode) {
                addBtn.classList.add('active');
                addBtn.textContent = '✓ 完成';
            } else {
                addBtn.classList.remove('active');
                addBtn.textContent = '➕';
            }
        });
    }

    /**
     * 更新连接状态显示
     */
    updateConnectionStatus(isOnline) {
        if (appState.get('isSyncing')) return;

        if (isOnline) {
            this.statusEl.className = 'connection-status online';
            this.statusEl.querySelector('.status-text').textContent = '在线';
        } else {
            this.statusEl.className = 'connection-status offline';
            this.statusEl.querySelector('.status-text').textContent = '离线';
        }
    }

    /**
     * 更新管理员按钮
     */
    updateAdminButtons(isAdmin) {
        const enterBtn = document.getElementById('enter-admin-btn');
        const exitBtn = document.getElementById('exit-admin-btn');
        const adminOnlyBtns = document.querySelectorAll('.admin-only');

        if (isAdmin) {
            enterBtn.classList.add('hidden');
            exitBtn.classList.remove('hidden');
            document.body.classList.add('is-admin');
            adminOnlyBtns.forEach(btn => btn.classList.remove('hidden'));
        } else {
            enterBtn.classList.remove('hidden');
            exitBtn.classList.add('hidden');
            document.body.classList.remove('is-admin');
            adminOnlyBtns.forEach(btn => btn.classList.add('hidden'));
        }
    }

    /**
     * 进入管理模式
     */
    enterAdminMode() {
        if (authService.isLoggedIn()) {
            appState.set('isAdmin', true);
            notification.success('已进入管理模式');
        } else {
            // 未登录，打开登录弹窗
            if (loginModal) loginModal.open();
        }
    }

    /**
     * 退出管理模式
     */
    exitAdminMode() {
        appState.set('isAdmin', false);
        appState.set('isAddMode', false);
        notification.info('已退出管理模式');
    }

    /**
     * 切换添加模式
     */
    toggleAddMode() {
        const isAddMode = appState.get('isAddMode');
        appState.set('isAddMode', !isAddMode);
    }

    /**
     * 处理刷新
     */
    async handleRefresh() {
        notification.info('正在刷新数据...');
        try {
            await syncService.sync();
            notification.success('数据已刷新');
        } catch (error) {
            notification.error('刷新失败: ' + error.message);
        }
    }

    /**
     * 处理测试连接
     */
    async handleTestConnection() {
        notification.info('正在测试连接...');
        try {
            const connected = await syncService.testConnection();
            if (connected) {
                notification.success('连接成功');
            } else {
                notification.warning('连接失败，使用本地数据');
            }
        } catch (error) {
            notification.error('连接测试失败: ' + error.message);
        }
    }
}

// 全局实例
let bottomBar;
