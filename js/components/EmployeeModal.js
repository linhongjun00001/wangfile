/**
 * EmployeeModal - 员工信息弹窗组件
 */
class EmployeeModal {
    constructor() {
        this.modal = document.getElementById('employee-modal');
        this.infoView = document.getElementById('employee-info');
        this.editForm = document.getElementById('employee-form');
        this.currentSeat = null;
        this.isEditing = false;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupStateWatchers();
        this.avatarData = null;
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

        // 编辑按钮
        document.getElementById('edit-seat-btn').addEventListener('click', () => {
            this.startEdit();
        });

        // 保存按钮
        document.getElementById('save-seat-btn').addEventListener('click', () => {
            this.saveEdit();
        });

        // 取消按钮
        document.getElementById('cancel-edit-btn').addEventListener('click', () => {
            this.cancelEdit();
        });

        // 删除按钮
        document.getElementById('delete-seat-btn').addEventListener('click', () => {
            this.deleteSeat();
        });

        // 头像上传 - 绑定点击事件
        this.bindAvatarUpload();

        // 监听工位点击事件
        eventBus.on('seat:click', (seat) => {
            this.open(seat);
        });
    }

    setupStateWatchers() {
        // 监听管理员状态变化，更新按钮显示
        appState.watch('isAdmin', (isAdmin) => {
            this.updateButtonVisibility();
        });
    }

    /**
     * 打开弹窗
     */
    open(seat) {
        this.currentSeat = seat;
        this.isEditing = false;
        this.showInfoView();
        this.updateButtonVisibility();
        this.modal.classList.remove('hidden');
    }

    /**
     * 关闭弹窗
     */
    close() {
        this.modal.classList.add('hidden');
        this.currentSeat = null;
        this.isEditing = false;
        appState.set('selectedSeatId', null);
    }

    /**
     * 显示信息视图
     */
    showInfoView() {
        if (!this.currentSeat) return;

        const seat = this.currentSeat;
        const statusText = {
            available: '空闲',
            occupied: '占用',
            maintenance: '维修'
        };

        document.getElementById('info-seat-number').textContent = seat.seat_number || '-';
        document.getElementById('info-name').textContent = seat.occupant_name || '-';
        document.getElementById('info-department').textContent = seat.occupant_department || '-';
        document.getElementById('info-phone').textContent = seat.occupant_phone || '-';
        document.getElementById('info-status').textContent = statusText[seat.status] || seat.status || '-';

        // 显示头像
        const avatarImg = document.getElementById('info-avatar');
        const avatarPlaceholder = document.getElementById('info-avatar-placeholder');
        if (avatarImg && avatarPlaceholder) {
            if (seat.avatar_url || seat.avatar_data) {
                avatarImg.src = seat.avatar_url || seat.avatar_data;
                avatarImg.style.display = 'block';
                avatarPlaceholder.style.display = 'none';
            } else {
                avatarImg.src = '';
                avatarImg.style.display = 'none';
                avatarPlaceholder.style.display = 'flex';
            }
        }

        this.infoView.classList.remove('hidden');
        this.editForm.classList.add('hidden');

        document.getElementById('save-seat-btn').classList.add('hidden');
        document.getElementById('cancel-edit-btn').classList.add('hidden');

        if (appState.get('isAdmin')) {
            document.getElementById('edit-seat-btn').classList.remove('hidden');
            document.getElementById('delete-seat-btn').classList.remove('hidden');
        }
    }

    /**
     * 开始编辑
     */
    startEdit() {
        if (!this.currentSeat) return;

        this.isEditing = true;
        this.avatarData = null;
        const seat = this.currentSeat;
        
        // 重新绑定头像上传事件（确保弹窗打开后事件有效）
        this.bindAvatarUpload();

        // 填充表单
        document.getElementById('edit-seat-id').value = seat.id;
        document.getElementById('edit-seat-number').value = seat.seat_number || '';
        document.getElementById('edit-name').value = seat.occupant_name || '';
        document.getElementById('edit-department').value = seat.occupant_department || '';
        document.getElementById('edit-phone').value = seat.occupant_phone || '';
        document.getElementById('edit-status').value = seat.status || 'available';

        // 填充区域选择
        const areaSelect = document.getElementById('edit-area');
        areaSelect.innerHTML = '';
        const areas = appState.get('areas').filter(a => a.floor_id === seat.floor_id);
        areas.forEach(area => {
            const option = document.createElement('option');
            option.value = area.id;
            option.textContent = area.name;
            if (area.id === seat.area_id) option.selected = true;
            areaSelect.appendChild(option);
        });

        // 填充头像预览
        const avatarImg = document.getElementById('edit-avatar-img');
        const avatarPlaceholder = document.getElementById('edit-avatar-placeholder');
        if (avatarImg && avatarPlaceholder) {
            if (seat.avatar_url || seat.avatar_data) {
                avatarImg.src = seat.avatar_url || seat.avatar_data;
                avatarImg.style.display = 'block';
                avatarPlaceholder.style.display = 'none';
            } else {
                avatarImg.src = '';
                avatarImg.style.display = 'none';
                avatarPlaceholder.style.display = 'block';
            }
        }

        this.infoView.classList.add('hidden');
        this.editForm.classList.remove('hidden');

        document.getElementById('edit-seat-btn').classList.add('hidden');
        document.getElementById('delete-seat-btn').classList.add('hidden');
        document.getElementById('save-seat-btn').classList.remove('hidden');
        document.getElementById('cancel-edit-btn').classList.remove('hidden');
    }

    /**
     * 保存编辑
     */
    async saveEdit() {
        if (!this.currentSeat) return;

        const updates = {
            id: this.currentSeat.id,
            seat_number: document.getElementById('edit-seat-number').value,
            occupant_name: document.getElementById('edit-name').value || null,
            occupant_department: document.getElementById('edit-department').value || null,
            occupant_phone: document.getElementById('edit-phone').value || null,
            status: document.getElementById('edit-status').value,
            area_id: document.getElementById('edit-area').value || null,
            x_position: this.currentSeat.x_position,
            y_position: this.currentSeat.y_position,
            width: this.currentSeat.width,
            height: this.currentSeat.height,
            floor_id: this.currentSeat.floor_id,
            updated_at: new Date().toISOString()
        };

        // 如果有新头像，添加到更新
        if (this.avatarData) {
            updates.avatar_data = this.avatarData;
        }

        const validation = Validators.seat(updates);
        if (!validation.isValid) {
            notification.error(validation.errors.join(', '));
            return;
        }

        try {
            await syncService.queueChange('seats', 'update', updates);
            notification.success('工位信息已更新');

            // 更新当前工位数据
            Object.assign(this.currentSeat, updates);
            this.avatarData = null;
            this.isEditing = false;
            this.showInfoView();
        } catch (error) {
            notification.error('更新失败: ' + error.message);
        }
    }

    /**
     * 取消编辑
     */
    cancelEdit() {
        this.isEditing = false;
        this.showInfoView();
    }

    /**
     * 删除工位
     */
    async deleteSeat() {
        if (!this.currentSeat) return;

        if (!confirm(`确定要删除工位 "${this.currentSeat.seat_number}" 吗？`)) {
            return;
        }

        try {
            await syncService.queueChange('seats', 'delete', { id: this.currentSeat.id });
            notification.success('工位已删除');
            this.close();
        } catch (error) {
            notification.error('删除失败: ' + error.message);
        }
    }

    /**
     * 绑定头像上传事件
     */
    bindAvatarUpload() {
        const uploadBtn = document.getElementById('upload-avatar-btn');
        const avatarPreview = document.getElementById('edit-avatar-preview');
        const avatarInput = document.getElementById('edit-avatar-input');
        
        if (!avatarInput) {
            console.error('Avatar input element not found');
            return;
        }
        
        // 绑定按钮点击
        if (uploadBtn) {
            uploadBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Upload button clicked');
                avatarInput.click();
                return false;
            };
        }
        
        // 绑定预览区域点击
        if (avatarPreview) {
            avatarPreview.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Preview clicked');
                avatarInput.click();
                return false;
            };
        }
        
        // 绑定文件选择变化
        avatarInput.onchange = (e) => {
            console.log('File input changed:', e.target.files);
            if (e.target.files && e.target.files[0]) {
                this.handleAvatarSelect(e.target.files[0]);
            }
            // 清空input值，允许重复选择同一文件
            e.target.value = '';
        };
    }

    /**
     * 处理头像选择
     */
    handleAvatarSelect(file) {
        if (!file) {
            console.log('No file selected');
            return;
        }

        console.log('Processing avatar file:', file.name, file.type, file.size);

        if (!file.type.startsWith('image/')) {
            notification.error('请选择图片文件');
            return;
        }

        // 检查文件大小（限制为2MB）
        if (file.size > 2 * 1024 * 1024) {
            notification.warning('头像图片过大，建议小于2MB');
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.avatarData = e.target.result;
            console.log('Avatar loaded, data length:', this.avatarData.length);
            
            const avatarImg = document.getElementById('edit-avatar-img');
            const avatarPlaceholder = document.getElementById('edit-avatar-placeholder');
            
            if (avatarImg) {
                avatarImg.src = this.avatarData;
                avatarImg.style.display = 'block';
                console.log('Avatar image updated');
            } else {
                console.error('edit-avatar-img element not found');
            }
            if (avatarPlaceholder) {
                avatarPlaceholder.style.display = 'none';
            }
            
            notification.success('头像已加载，点击保存即可');
        };
        
        reader.onerror = (e) => {
            console.error('FileReader error:', e);
            notification.error('头像读取失败');
        };
        
        reader.readAsDataURL(file);
    }

    /**
     * 更新按钮可见性
     */
    updateButtonVisibility() {
        const isAdmin = appState.get('isAdmin');
        const editBtn = document.getElementById('edit-seat-btn');
        const deleteBtn = document.getElementById('delete-seat-btn');

        if (isAdmin && !this.isEditing) {
            editBtn.classList.remove('hidden');
            deleteBtn.classList.remove('hidden');
        } else {
            editBtn.classList.add('hidden');
            deleteBtn.classList.add('hidden');
        }
    }
}

// 全局实例
let employeeModal;
