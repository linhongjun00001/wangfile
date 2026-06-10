/**
 * FloorMap - 工位图主组件
 * 负责SVG渲染、缩放平移、交互处理
 */
class FloorMap {
    constructor() {
        this.svg = document.getElementById('floor-map');
        this.container = document.getElementById('floor-map-container');
        this.wrapper = document.getElementById('floor-map-wrapper');
        this.bgImage = document.getElementById('floor-bg-image');
        this.areasLayer = document.getElementById('areas-layer');
        this.seatsLayer = document.getElementById('seats-layer');
        this.labelsLayer = document.getElementById('labels-layer');

        this.zoom = 1;
        this.pan = { x: 0, y: 0 };
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.lastPan = { x: 0, y: 0 };

        this.seatElements = new Map();
        this.tooltip = null;
        this.addModeIndicator = null;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupZoomControls();
        this.setupStateWatchers();
    }

    setupEventListeners() {
        // 鼠标滚轮缩放
        this.container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -CONFIG.ZOOM_STEP : CONFIG.ZOOM_STEP;
            this.zoomAt(e.clientX, e.clientY, delta);
        }, { passive: false });

        // 鼠标拖拽平移
        this.container.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // 只响应左键
            if (appState.get('isAddMode')) {
                this.handleAddModeClick(e);
                return;
            }
            this.startPan(e.clientX, e.clientY);
        });

        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.panTo(e.clientX, e.clientY);
            }
        });

        document.addEventListener('mouseup', () => {
            this.endPan();
        });

        // 右键取消添加模式
        this.container.addEventListener('contextmenu', (e) => {
            if (appState.get('isAddMode')) {
                e.preventDefault();
                this.exitAddMode();
            }
        });

        // ESC键取消添加模式
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && appState.get('isAddMode')) {
                this.exitAddMode();
            }
        });

        // 触摸事件（移动端）
        this.container.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                if (appState.get('isAddMode')) {
                    this.handleAddModeClick(touch);
                    return;
                }
                this.startPan(touch.clientX, touch.clientY);
            } else if (e.touches.length === 2) {
                this.lastPinchDistance = this.getPinchDistance(e.touches);
            }
        }, { passive: false });

        this.container.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length === 1 && this.isDragging) {
                const touch = e.touches[0];
                this.panTo(touch.clientX, touch.clientY);
            } else if (e.touches.length === 2) {
                const distance = this.getPinchDistance(e.touches);
                const delta = distance - this.lastPinchDistance;
                if (Math.abs(delta) > 5) {
                    const center = this.getTouchCenter(e.touches);
                    this.zoomAt(center.x, center.y, delta * 0.002);
                    this.lastPinchDistance = distance;
                }
            }
        }, { passive: false });

        this.container.addEventListener('touchend', () => {
            this.endPan();
        });
    }

    setupZoomControls() {
        // 创建缩放控制按钮
        const zoomControls = document.createElement('div');
        zoomControls.className = 'zoom-controls';
        zoomControls.innerHTML = `
            <button class="zoom-btn" id="zoom-in" title="放大">+</button>
            <button class="zoom-btn" id="zoom-out" title="缩小">-</button>
            <button class="zoom-btn" id="zoom-reset" title="重置">⟲</button>
        `;
        this.wrapper.appendChild(zoomControls);

        document.getElementById('zoom-in').addEventListener('click', () => {
            this.zoomCenter(CONFIG.ZOOM_STEP);
        });
        document.getElementById('zoom-out').addEventListener('click', () => {
            this.zoomCenter(-CONFIG.ZOOM_STEP);
        });
        document.getElementById('zoom-reset').addEventListener('click', () => {
            this.resetView();
        });
    }

    setupStateWatchers() {
        // 监听当前楼层变化
        appState.watch('currentFloorId', () => {
            this.render();
        });

        // 监听工位数据变化
        appState.watch('seats', () => {
            this.renderSeats();
        });

        // 监听区域数据变化
        appState.watch('areas', () => {
            this.renderAreas();
        });

        // 监听添加模式
        appState.watch('isAddMode', (isAddMode) => {
            if (isAddMode) {
                this.container.classList.add('add-mode');
                this.showAddModeIndicator();
            } else {
                this.container.classList.remove('add-mode');
                this.hideAddModeIndicator();
            }
        });

        // 监听选中工位
        appState.watch('selectedSeatId', (seatId) => {
            this.highlightSeat(seatId);
        });
    }

    /**
     * 渲染完整地图
     */
    render() {
        const floorId = appState.get('currentFloorId');
        if (!floorId) {
            this.showEmptyState();
            return;
        }

        const floor = appState.get('floors').find(f => f.id === floorId);
        if (!floor) return;

        // 设置底图
        if (floor.bg_image_url || floor.bg_image_data) {
            this.bgImage.setAttribute('href', floor.bg_image_url || floor.bg_image_data);
            this.bgImage.style.display = '';
        } else {
            this.bgImage.style.display = 'none';
            this.container.classList.add('grid-background');
        }

        // 设置SVG尺寸
        if (floor.width && floor.height) {
            this.svg.setAttribute('viewBox', `0 0 ${floor.width} ${floor.height}`);
        }

        this.renderAreas();
        this.renderSeats();
    }

    /**
     * 渲染区域
     * 注：当上传了底图时，不显示区域方块覆盖层，以底图为准
     */
    renderAreas() {
        const floorId = appState.get('currentFloorId');
        if (!floorId) return;

        const floor = appState.get('floors').find(f => f.id === floorId);
        
        // 如果已上传底图，清空区域覆盖层（以底图为准）
        if (floor && (floor.bg_image_url || floor.bg_image_data)) {
            this.areasLayer.innerHTML = '';
            return;
        }

        // 没有底图时，显示默认区域方块
        const areas = appState.get('areas').filter(a => a.floor_id === floorId);
        this.areasLayer.innerHTML = '';

        areas.forEach(area => {
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', '50');
            rect.setAttribute('y', '50');
            rect.setAttribute('width', '200');
            rect.setAttribute('height', '150');
            rect.setAttribute('fill', area.color || '#3b82f6');
            rect.setAttribute('class', 'area-overlay');
            this.areasLayer.appendChild(rect);

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', '150');
            text.setAttribute('y', '125');
            text.setAttribute('class', 'area-label');
            text.setAttribute('fill', area.color || '#3b82f6');
            text.textContent = area.name;
            this.areasLayer.appendChild(text);
        });
    }

    /**
     * 渲染工位
     */
    renderSeats() {
        const floorId = appState.get('currentFloorId');
        if (!floorId) return;

        const seats = appState.get('seats').filter(s => s.floor_id === floorId);
        this.seatsLayer.innerHTML = '';
        this.labelsLayer.innerHTML = '';
        this.seatElements.clear();

        seats.forEach(seat => {
            this.createSeatElement(seat);
        });
    }

    /**
     * 创建工位SVG元素
     */
    createSeatElement(seat) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', `seat-element status-${seat.status || 'empty'}`);
        group.setAttribute('data-seat-id', seat.id);
        group.style.cursor = 'pointer';

        const width = seat.width || CONFIG.DEFAULT_SEAT_WIDTH;
        const height = seat.height || CONFIG.DEFAULT_SEAT_HEIGHT;

        // 如果有员工头像，显示圆形头像
        if (seat.avatar_url || seat.avatar_data) {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', seat.x_position + width / 2);
            circle.setAttribute('cy', seat.y_position + height / 2);
            circle.setAttribute('r', Math.min(width, height) / 2);
            circle.setAttribute('fill', 'var(--primary)');
            circle.setAttribute('stroke', '#fff');
            circle.setAttribute('stroke-width', '2');
            group.appendChild(circle);

            // 使用foreignObject嵌入头像图片
            const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
            foreignObject.setAttribute('x', seat.x_position);
            foreignObject.setAttribute('y', seat.y_position);
            foreignObject.setAttribute('width', width);
            foreignObject.setAttribute('height', height);
            
            const img = document.createElement('img');
            img.src = seat.avatar_url || seat.avatar_data;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.borderRadius = '50%';
            img.style.objectFit = 'cover';
            img.style.border = '2px solid #fff';
            img.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
            
            foreignObject.appendChild(img);
            group.appendChild(foreignObject);
        } else {
            // 没有头像时显示默认矩形
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', seat.x_position);
            rect.setAttribute('y', seat.y_position);
            rect.setAttribute('width', width);
            rect.setAttribute('height', height);
            rect.setAttribute('rx', '4');
            rect.setAttribute('ry', '4');
            group.appendChild(rect);
        }

        // 添加标签（工位编号或姓名）
        if (seat.seat_number || seat.occupant_name) {
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', seat.x_position + width / 2);
            text.setAttribute('y', seat.y_position + height + 14);
            text.setAttribute('class', 'seat-label');
            text.textContent = seat.occupant_name || seat.seat_number;
            this.labelsLayer.appendChild(text);
        }

        // 事件绑定
        group.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleSeatClick(seat, e);
        });

        group.addEventListener('mouseenter', (e) => {
            this.showTooltip(seat, e);
        });

        group.addEventListener('mouseleave', () => {
            this.hideTooltip();
        });

        // 管理模式下支持拖拽
        if (appState.get('isAdmin')) {
            this.makeDraggable(group, seat);
        }

        this.seatsLayer.appendChild(group);
        this.seatElements.set(seat.id, { group, seat });

        return group;
    }

    /**
     * 使工位可拖拽
     */
    makeDraggable(element, seat) {
        let isDragging = false;
        let startX, startY;
        let originalX, originalY;

        element.addEventListener('mousedown', (e) => {
            if (!appState.get('isAdmin')) return;
            e.stopPropagation();
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            originalX = seat.x_position;
            originalY = seat.y_position;
            element.classList.add('dragging');
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = (e.clientX - startX) / this.zoom;
            const dy = (e.clientY - startY) / this.zoom;
            seat.x_position = originalX + dx;
            seat.y_position = originalY + dy;
            this.updateSeatPosition(seat);
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                element.classList.remove('dragging');
                // 保存位置变更
                syncService.queueChange('seats', 'update', seat);
            }
        });
    }

    /**
     * 更新工位位置
     */
    updateSeatPosition(seat) {
        const element = this.seatElements.get(seat.id);
        if (!element) return;

        const rect = element.group.querySelector('rect');
        rect.setAttribute('x', seat.x_position);
        rect.setAttribute('y', seat.y_position);

        // 更新标签位置
        const label = this.labelsLayer.querySelector(`text[data-seat-id="${seat.id}"]`);
        if (label) {
            label.setAttribute('x', seat.x_position + (seat.width || CONFIG.DEFAULT_SEAT_WIDTH) / 2);
            label.setAttribute('y', seat.y_position + (seat.height || CONFIG.DEFAULT_SEAT_HEIGHT) / 2);
        }
    }

    /**
     * 处理工位点击
     */
    handleSeatClick(seat, event) {
        appState.set('selectedSeatId', seat.id);

        if (appState.get('isAdmin')) {
            // 长按检测（移动端）
            const longPressTimer = setTimeout(() => {
                eventBus.emit('seat:longpress', seat);
            }, CONFIG.LONG_PRESS_DURATION);

            const clearTimer = () => {
                clearTimeout(longPressTimer);
                document.removeEventListener('mouseup', clearTimer);
                document.removeEventListener('touchend', clearTimer);
            };

            document.addEventListener('mouseup', clearTimer);
            document.addEventListener('touchend', clearTimer);
        }

        eventBus.emit('seat:click', seat);
    }

    /**
     * 处理添加模式点击
     */
    handleAddModeClick(event) {
        const point = this.getSVGPoint(event.clientX, event.clientY);
        if (!point) return;

        const newSeat = {
            id: Validators.generateUUID(),
            floor_id: appState.get('currentFloorId'),
            seat_number: `NEW-${Date.now().toString().slice(-4)}`,
            x_position: point.x - CONFIG.DEFAULT_SEAT_WIDTH / 2,
            y_position: point.y - CONFIG.DEFAULT_SEAT_HEIGHT / 2,
            width: CONFIG.DEFAULT_SEAT_WIDTH,
            height: CONFIG.DEFAULT_SEAT_HEIGHT,
            status: 'available',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        syncService.queueChange('seats', 'insert', newSeat);
        notification.success('工位已添加');

        // 添加完成后自动退出添加模式（根据需求可改为连续添加）
        // this.exitAddMode();
    }

    /**
     * 退出添加模式
     */
    exitAddMode() {
        appState.set('isAddMode', false);
    }

    /**
     * 显示添加模式指示器
     */
    showAddModeIndicator() {
        if (this.addModeIndicator) return;
        this.addModeIndicator = document.createElement('div');
        this.addModeIndicator.className = 'add-mode-indicator';
        this.addModeIndicator.textContent = '点击地图添加工位';
        this.wrapper.appendChild(this.addModeIndicator);
    }

    /**
     * 隐藏添加模式指示器
     */
    hideAddModeIndicator() {
        if (this.addModeIndicator) {
            this.addModeIndicator.remove();
            this.addModeIndicator = null;
        }
    }

    /**
     * 显示提示框
     */
    showTooltip(seat, event) {
        this.hideTooltip();

        const tooltip = document.createElement('div');
        tooltip.className = 'seat-tooltip';

        const statusText = {
            available: '空闲',
            occupied: '占用',
            maintenance: '维修'
        };

        tooltip.innerHTML = `
            <div class="tooltip-title">${seat.seat_number || '未命名工位'}</div>
            <div class="tooltip-row"><span class="tooltip-label">姓名:</span>${seat.occupant_name || '无'}</div>
            <div class="tooltip-row"><span class="tooltip-label">部门:</span>${seat.occupant_department || '无'}</div>
            <div class="tooltip-row"><span class="tooltip-label">状态:</span>${statusText[seat.status] || seat.status}</div>
        `;

        document.body.appendChild(tooltip);

        // 定位
        const rect = this.container.getBoundingClientRect();
        tooltip.style.left = `${event.clientX + 10}px`;
        tooltip.style.top = `${event.clientY - 10}px`;

        this.tooltip = tooltip;
    }

    /**
     * 隐藏提示框
     */
    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.remove();
            this.tooltip = null;
        }
    }

    /**
     * 高亮工位
     */
    highlightSeat(seatId) {
        this.seatElements.forEach(({ group }) => {
            group.classList.remove('selected', 'search-highlight');
        });

        if (seatId) {
            const element = this.seatElements.get(seatId);
            if (element) {
                element.group.classList.add('selected');
            }
        }
    }

    /**
     * 搜索高亮
     */
    highlightSearch(seatIds) {
        this.seatElements.forEach(({ group }) => {
            group.classList.remove('search-highlight');
        });

        seatIds.forEach(id => {
            const element = this.seatElements.get(id);
            if (element) {
                element.group.classList.add('search-highlight');
            }
        });
    }

    /**
     * 缩放
     */
    zoomAt(clientX, clientY, delta) {
        const newZoom = Math.max(CONFIG.MIN_ZOOM, Math.min(CONFIG.MAX_ZOOM, this.zoom + delta));
        if (newZoom === this.zoom) return;

        const rect = this.container.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const scaleChange = newZoom / this.zoom;
        this.pan.x = x - (x - this.pan.x) * scaleChange;
        this.pan.y = y - (y - this.pan.y) * scaleChange;
        this.zoom = newZoom;

        this.applyTransform();
    }

    /**
     * 中心缩放
     */
    zoomCenter(delta) {
        const rect = this.container.getBoundingClientRect();
        this.zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, delta);
    }

    /**
     * 开始平移
     */
    startPan(clientX, clientY) {
        this.isDragging = true;
        this.dragStart = { x: clientX, y: clientY };
        this.lastPan = { ...this.pan };
        this.container.style.cursor = 'grabbing';
    }

    /**
     * 平移
     */
    panTo(clientX, clientY) {
        if (!this.isDragging) return;
        const dx = clientX - this.dragStart.x;
        const dy = clientY - this.dragStart.y;
        this.pan.x = this.lastPan.x + dx;
        this.pan.y = this.lastPan.y + dy;
        this.applyTransform();
    }

    /**
     * 结束平移
     */
    endPan() {
        this.isDragging = false;
        this.container.style.cursor = '';
    }

    /**
     * 应用变换
     */
    applyTransform() {
        this.svg.style.transform = `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom})`;
    }

    /**
     * 重置视图
     */
    resetView() {
        this.zoom = 1;
        this.pan = { x: 0, y: 0 };
        this.applyTransform();
    }

    /**
     * 获取SVG坐标点
     */
    getSVGPoint(clientX, clientY) {
        const pt = this.svg.createSVGPoint();
        pt.x = clientX;
        pt.y = clientY;
        const svgP = pt.matrixTransform(this.svg.getScreenCTM().inverse());
        return { x: svgP.x, y: svgP.y };
    }

    /**
     * 获取捏合距离
     */
    getPinchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * 获取触摸中心
     */
    getTouchCenter(touches) {
        return {
            x: (touches[0].clientX + touches[1].clientX) / 2,
            y: (touches[0].clientY + touches[1].clientY) / 2
        };
    }

    /**
     * 显示空状态
     */
    showEmptyState() {
        this.seatsLayer.innerHTML = '';
        this.labelsLayer.innerHTML = '';
        this.areasLayer.innerHTML = '';
        this.bgImage.style.display = 'none';
    }
}

// 全局工位图实例
let floorMap;
