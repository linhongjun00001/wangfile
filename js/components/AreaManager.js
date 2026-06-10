/**
 * AreaManager - 区域管理组件
 */
class AreaManager {
    constructor() {
        this.modal = document.getElementById('area-modal');
        this.listContainer = document.getElementById('area-list');
        this.isOpen = false;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupStateWatchers();
    }

    setupEventListeners() {
        // 关闭按钮
        this.modal.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', () => this.close());
        });

        // 点击遮罩关闭
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });

        // 添加区域按钮
        document.getElementById('add-area-btn').addEventListener('click', () => {
            this.addArea();
        });
    }

    setupStateWatchers() {
        // 监听区域数据变化
        appState.watch('areas', () => {
            if (this.isOpen) {
                this.renderList();
            }
        });
    }

    /**
     * 打开弹窗
     */
    open() {
        this.isOpen = true;
        this.renderList();
        this.modal.classList.remove('hidden');
    }

    /**
     * 关闭弹窗
     */
    close() {
        this.isOpen = false;
        this.modal.classList.add('hidden');
    }

    /**
     * 渲染区域列表
     */
    renderList() {
        const floorId = appState.get('currentFloorId');
        const areas = appState.get('areas').filter(a => !floorId || a.floor_id === floorId);

        this.listContainer.innerHTML = '';

        if (areas.length === 0) {
            this.listContainer.innerHTML = '<p style="text-align:center;color:var(--muted);padding:20px">暂无区域</p>';
            return;
        }

        areas.forEach(area => {
            const item = document.createElement('div');
            item.className = 'area-item';
            item.innerHTML = `
                <div style="display:flex;align-items:center;flex:1">
                    <span class="area-color-dot" style="background:${area.color || '#3b82f6'}"></span>
                    <span class="area-item-name">${area.name}</span>
                </div>
                <div class="area-item-actions">
                    <button class="btn-edit" data-area-id="${area.id}">编辑</button>
                    <button class="btn-delete" data-area-id="${area.id}">删除</button>
                </div>
            `;

            // 编辑按钮
            item.querySelector('.btn-edit').addEventListener('click', () => {
                this.editArea(area);
            });

            // 删除按钮
            item.querySelector('.btn-delete').addEventListener('click', () => {
                this.deleteArea(area);
            });

            this.listContainer.appendChild(item);
        });
    }

    /**
     * 添加区域
     */
    async addArea() {
        const name = document.getElementById('area-name').value.trim();
        const color = document.getElementById('area-color').value;
        const floorId = appState.get('currentFloorId');

        if (!name) {
            notification.error('请输入区域名称');
            return;
        }

        const areaData = {
            id: Validators.generateUUID(),
            floor_id: floorId,
            name,
            color,
            created_at: new Date().toISOString()
        };

        const validation = Validators.area(areaData);
        if (!validation.isValid) {
            notification.error(validation.errors.join(', '));
            return;
        }

        try {
            await syncService.queueChange('areas', 'insert', areaData);
            notification.success('区域已添加');

            // 清空表单
            document.getElementById('area-name').value = '';
        } catch (error) {
            notification.error('添加失败: ' + error.message);
        }
    }

    /**
     * 编辑区域
     */
    async editArea(area) {
        const newName = prompt('区域名称:', area.name);
        if (newName === null) return; // 用户取消

        const newNameTrimmed = newName.trim();
        if (!newNameTrimmed) {
            notification.error('区域名称不能为空');
            return;
        }

        const updates = {
            ...area,
            name: newNameTrimmed,
            updated_at: new Date().toISOString()
        };

        try {
            await syncService.queueChange('areas', 'update', updates);
            notification.success('区域已更新');
        } catch (error) {
            notification.error('更新失败: ' + error.message);
        }
    }

    /**
     * 删除区域
     */
    async deleteArea(area) {
        if (!confirm(`确定要删除区域 "${area.name}" 吗？\n注意：该区域下的工位将变为未分配状态。`)) {
            return;
        }

        try {
            await syncService.queueChange('areas', 'delete', { id: area.id });
            notification.success('区域已删除');
        } catch (error) {
            notification.error('删除失败: ' + error.message);
        }
    }
}

// 全局实例
let areaManager;
