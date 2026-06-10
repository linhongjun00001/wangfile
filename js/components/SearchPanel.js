/**
 * SearchPanel - 搜索面板组件
 */
class SearchPanel {
    constructor() {
        this.panel = document.getElementById('search-panel');
        this.resultsContainer = document.getElementById('search-results');
        this.searchInput = document.getElementById('search-input');
        this.isOpen = false;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupStateWatchers();
    }

    setupEventListeners() {
        // 搜索按钮
        document.getElementById('search-btn').addEventListener('click', () => {
            this.toggle();
        });

        // 搜索输入
        this.searchInput.addEventListener('input', debounce(() => {
            this.performSearch();
        }, 300));

        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });

        // 关闭按钮
        document.getElementById('close-search').addEventListener('click', () => {
            this.close();
        });
    }

    setupStateWatchers() {
        // 监听搜索查询变化
        appState.watch('searchQuery', (query) => {
            if (query) {
                this.open();
                this.renderResults();
            }
        });

        // 监听搜索结果变化
        appState.watch('searchResults', () => {
            this.renderResults();
        });
    }

    /**
     * 切换面板
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
            this.searchInput.focus();
        }
    }

    /**
     * 打开面板
     */
    open() {
        this.isOpen = true;
        this.panel.classList.remove('hidden');
    }

    /**
     * 关闭面板
     */
    close() {
        this.isOpen = false;
        this.panel.classList.add('hidden');
        this.searchInput.value = '';
        appState.set('searchQuery', '');
        appState.set('searchResults', []);
        // 清除高亮
        if (floorMap) {
            floorMap.highlightSearch([]);
        }
    }

    /**
     * 执行搜索
     */
    performSearch() {
        const query = this.searchInput.value.trim().toLowerCase();
        appState.set('searchQuery', query);

        if (!query) {
            appState.set('searchResults', []);
            if (floorMap) floorMap.highlightSearch([]);
            return;
        }

        const seats = appState.get('seats');
        const results = seats.filter(seat => {
            const matchSeatNumber = (seat.seat_number || '').toLowerCase().includes(query);
            const matchName = (seat.occupant_name || '').toLowerCase().includes(query);
            const matchDepartment = (seat.occupant_department || '').toLowerCase().includes(query);
            return matchSeatNumber || matchName || matchDepartment;
        });

        appState.set('searchResults', results);

        // 高亮搜索结果
        if (floorMap) {
            floorMap.highlightSearch(results.map(r => r.id));
        }
    }

    /**
     * 渲染搜索结果
     */
    renderResults() {
        const results = appState.get('searchResults');
        const query = appState.get('searchQuery');

        this.resultsContainer.innerHTML = '';

        if (!query) {
            this.resultsContainer.innerHTML = '<div class="no-results">输入关键词开始搜索</div>';
            return;
        }

        if (results.length === 0) {
            this.resultsContainer.innerHTML = '<div class="no-results">未找到匹配结果</div>';
            return;
        }

        results.forEach(seat => {
            const item = document.createElement('div');
            item.className = 'search-result-item';

            const floor = appState.get('floors').find(f => f.id === seat.floor_id);
            const area = appState.get('areas').find(a => a.id === seat.area_id);

            item.innerHTML = `
                <div class="result-name">${seat.occupant_name || '未分配'}</div>
                <div class="result-meta">
                    ${seat.occupant_department || '无部门'} · ${floor?.display_name || '未知园区'}
                </div>
                <div class="result-seat">工位: ${seat.seat_number || '-'}</div>
            `;

            item.addEventListener('click', () => {
                this.selectResult(seat);
            });

            this.resultsContainer.appendChild(item);
        });
    }

    /**
     * 选择搜索结果
     */
    selectResult(seat) {
        // 切换到对应楼层
        if (seat.floor_id !== appState.get('currentFloorId')) {
            appState.set('currentFloorId', seat.floor_id);
        }

        // 高亮选中工位
        appState.set('selectedSeatId', seat.id);

        // 关闭搜索面板
        this.close();

        // 打开员工信息弹窗
        eventBus.emit('seat:click', seat);
    }
}

// 全局实例
let searchPanel;
