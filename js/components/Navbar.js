/**
 * Navbar - 顶部导航栏组件
 */
class Navbar {
    constructor() {
        this.floorSelect = document.getElementById('floor-select');

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupStateWatchers();
    }

    setupEventListeners() {
        // 园区选择
        this.floorSelect.addEventListener('change', (e) => {
            const floorId = e.target.value;
            appState.set('currentFloorId', floorId || null);
            if (floorId) {
                const floor = appState.get('floors').find(f => f.id === floorId);
                appState.set('currentFloor', floor || null);
            }
        });
    }

    setupStateWatchers() {
        // 监听楼层数据变化
        appState.watch('floors', () => {
            this.renderFloorOptions();
        });

        // 监听当前楼层变化
        appState.watch('currentFloorId', (floorId) => {
            this.floorSelect.value = floorId || '';
        });
    }

    /**
     * 渲染园区选项
     */
    renderFloorOptions() {
        const floors = appState.get('floors');
        const currentValue = this.floorSelect.value;

        this.floorSelect.innerHTML = '<option value="">选择园区/区域</option>';

        floors.forEach(floor => {
            const option = document.createElement('option');
            option.value = floor.id;
            option.textContent = floor.display_name || floor.name;
            if (floor.id === currentValue) {
                option.selected = true;
            }
            this.floorSelect.appendChild(option);
        });
    }
}

// 全局实例
let navbar;
