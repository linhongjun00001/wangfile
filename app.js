/**
 * App - 应用入口
 * 初始化所有组件和服务
 */
class App {
    constructor() {
        this.initialized = false;
    }

    /**
     * 初始化应用
     */
    async init() {
        if (this.initialized) return;

        console.log('Initializing 3D Workstation Map...');

        try {
            // 1. 初始化数据库
            await this.initDatabase();

            // 2. 初始化认证
            await this.initAuth();

            // 3. 初始化Supabase（可选）
            await this.initSupabase();

            // 4. 初始化同步服务
            await this.initSync();

            // 5. 初始化UI组件
            this.initComponents();

            // 6. 加载初始数据
            await this.loadInitialData();

            // 7. 设置事件监听
            this.setupGlobalEvents();

            this.initialized = true;
            console.log('App initialized successfully');
            notification.success('应用初始化完成');
        } catch (error) {
            console.error('App initialization failed:', error);
            notification.error('应用初始化失败: ' + error.message);
        }
    }

    /**
     * 初始化数据库
     */
    async initDatabase() {
        try {
            await dbService.init();
            await dbService.initDefaultData();
            console.log('Database initialized');
        } catch (error) {
            console.warn('IndexedDB init failed, using memory fallback:', error);
            // 降级到内存存储
        }
    }

    /**
     * 初始化认证
     */
    async initAuth() {
        await authService.init();
        console.log('Auth initialized');
    }

    /**
     * 初始化Supabase
     */
    async initSupabase() {
        if (!CONFIG.DEV_MODE) {
            await supabaseService.init();
        }
    }

    /**
     * 初始化同步服务
     */
    async initSync() {
        await syncService.init();
        console.log('Sync service initialized');
    }

    /**
     * 初始化UI组件
     */
    initComponents() {
        // 核心组件
        navbar = new Navbar();
        bottomBar = new BottomBar();
        floorMap = new FloorMap();

        // 弹窗组件
        employeeModal = new EmployeeModal();
        loginModal = new LoginModal();
        qrCodeModal = new QRCodeModal();
        areaManager = new AreaManager();
        imageUploader = new ImageUploader();
        searchPanel = new SearchPanel();

        console.log('Components initialized');
    }

    /**
     * 加载初始数据
     */
    async loadInitialData() {
        try {
            // 从本地数据库加载数据
            const floors = await dbService.getAll('floors');
            const areas = await dbService.getAll('areas');
            const seats = await dbService.getAll('seats');

            appState.batchUpdate({
                floors: floors.length > 0 ? floors : CONFIG.DEFAULT_FLOORS,
                areas: areas.length > 0 ? areas : CONFIG.DEFAULT_AREAS,
                seats: seats.length > 0 ? seats : []
            });

            // 如果有楼层数据，默认选中第一个
            const currentFloors = appState.get('floors');
            if (currentFloors.length > 0 && !appState.get('currentFloorId')) {
                appState.set('currentFloorId', currentFloors[0].id);
            }

            console.log('Initial data loaded');
        } catch (error) {
            console.error('Load initial data failed:', error);
            // 使用默认数据
            appState.batchUpdate({
                floors: CONFIG.DEFAULT_FLOORS,
                areas: CONFIG.DEFAULT_AREAS,
                seats: []
            });
            appState.set('currentFloorId', CONFIG.DEFAULT_FLOORS[0].id);
        }
    }

    /**
     * 设置全局事件
     */
    setupGlobalEvents() {
        // 同步成功
        eventBus.on('sync:success', (data) => {
            notification.success('数据同步成功', 2000);
        });

        // 同步失败
        eventBus.on('sync:error', (data) => {
            notification.error(`同步失败 (${data.retryCount}/${CONFIG.SYNC_MAX_RETRIES})`, 3000);
        });

        // 登录成功
        eventBus.on('auth:login:success', (user) => {
            appState.set('isAdmin', true);
            appState.set('user', user);
        });

        // 登出
        eventBus.on('auth:logout', () => {
            appState.set('isAdmin', false);
            appState.set('user', null);
        });

        // 窗口大小变化
        window.addEventListener('resize', debounce(() => {
            eventBus.emit('window:resize');
        }, 250));

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + F 打开搜索
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                if (searchPanel) searchPanel.toggle();
            }

            // ESC 关闭弹窗
            if (e.key === 'Escape') {
                const modals = document.querySelectorAll('.modal:not(.hidden)');
                modals.forEach(modal => modal.classList.add('hidden'));
            }
        });

        // 在线/离线状态
        window.addEventListener('online', () => {
            appState.set('isOnline', true);
            notification.success('网络已恢复');
            syncService.sync();
        });

        window.addEventListener('offline', () => {
            appState.set('isOnline', false);
            notification.warning('网络已断开，使用本地数据');
        });
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});
