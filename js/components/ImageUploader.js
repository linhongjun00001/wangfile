/**
 * ImageUploader - 底图上传组件
 */
class ImageUploader {
    constructor() {
        this.modal = document.getElementById('upload-modal');
        this.uploadArea = document.getElementById('upload-area');
        this.fileInput = document.getElementById('bg-image-input');
        this.previewContainer = document.getElementById('upload-preview');
        this.previewImage = document.getElementById('preview-image');
        this.confirmBtn = document.getElementById('confirm-upload-btn');

        this.currentFile = null;
        this.isOpen = false;

        this.init();
    }

    init() {
        this.setupEventListeners();
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

        // 点击上传区域
        this.uploadArea.addEventListener('click', () => {
            this.fileInput.click();
        });

        // 文件选择
        this.fileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files[0]);
        });

        // 拖拽上传
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.classList.add('drag-over');
        });

        this.uploadArea.addEventListener('dragleave', () => {
            this.uploadArea.classList.remove('drag-over');
        });

        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) {
                this.handleFileSelect(file);
            }
        });

        // 确认上传
        this.confirmBtn.addEventListener('click', () => {
            this.confirmUpload();
        });
    }

    /**
     * 打开弹窗
     */
    open() {
        this.isOpen = true;
        this.reset();
        this.modal.classList.remove('hidden');
    }

    /**
     * 关闭弹窗
     */
    close() {
        this.isOpen = false;
        this.modal.classList.add('hidden');
        this.reset();
    }

    /**
     * 重置状态
     */
    reset() {
        this.currentFile = null;
        this.fileInput.value = '';
        this.previewContainer.classList.add('hidden');
        this.confirmBtn.classList.add('hidden');
        this.uploadArea.style.display = '';
    }

    /**
     * 处理文件选择
     */
    handleFileSelect(file) {
        if (!file) return;

        // 检查文件类型
        const isSupported = CONFIG.SUPPORTED_IMAGE_TYPES.some(type => 
            file.type === type || file.name.toLowerCase().endsWith(type.split('/')[1])
        );
        
        if (!isSupported && !file.type.startsWith('image/')) {
            notification.error('不支持的文件格式，请上传图片文件');
            return;
        }

        this.currentFile = file;

        // 显示预览
        const reader = new FileReader();
        reader.onload = (e) => {
            this.previewImage.src = e.target.result;
            this.previewContainer.classList.remove('hidden');
            this.confirmBtn.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }

    /**
     * 确认上传
     */
    async confirmUpload() {
        if (!this.currentFile) return;

        const floorId = appState.get('currentFloorId');
        if (!floorId) {
            notification.error('请先选择园区/楼层');
            return;
        }

        this.confirmBtn.disabled = true;
        this.confirmBtn.textContent = '上传中...';

        try {
            // 压缩图片
            const compressedImage = await this.compressImage(this.currentFile);

            // 尝试上传到Supabase
            let imageUrl = null;
            if (supabaseService.isConnected) {
                try {
                    const path = `floor-${floorId}-${Date.now()}.jpg`;
                    await supabaseService.uploadImage('floor-images', path, compressedImage.blob);
                    imageUrl = supabaseService.getImageUrl('floor-images', path);
                    console.log('Floor image uploaded to Supabase:', imageUrl);
                } catch (error) {
                    console.warn('Server upload failed, falling back to local:', error);
                }
            }

            // 更新楼层数据（始终保存base64到本地作为fallback）
            const floor = appState.get('floors').find(f => f.id === floorId);
            if (floor) {
                const updates = {
                    ...floor,
                    bg_image_url: imageUrl,
                    // 始终保存base64到本地，确保离线和手机端都能显示
                    bg_image_data: compressedImage.dataUrl,
                    width: compressedImage.width,
                    height: compressedImage.height,
                    updated_at: new Date().toISOString()
                };

                // 先保存到本地IndexedDB（包含完整base64）
                await dbService.put('floors', updates);

                // 再同步到Supabase（只推送URL，不推送base64大字段）
                await syncService.queueChange('floors', 'update', updates);

                notification.success(imageUrl ? '底图上传成功（已同步到云端）' : '底图已保存到本地');
                this.close();
            }
        } catch (error) {
            notification.error('上传失败: ' + error.message);
        } finally {
            this.confirmBtn.disabled = false;
            this.confirmBtn.textContent = '确认上传';
        }
    }

    /**
     * 压缩图片
     */
    compressImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const reader = new FileReader();

            reader.onload = (e) => {
                img.src = e.target.result;
            };

            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // 限制最大尺寸
                if (width > CONFIG.COMPRESSED_IMAGE_MAX_WIDTH) {
                    height = (height * CONFIG.COMPRESSED_IMAGE_MAX_WIDTH) / width;
                    width = CONFIG.COMPRESSED_IMAGE_MAX_WIDTH;
                }
                if (height > CONFIG.COMPRESSED_IMAGE_MAX_HEIGHT) {
                    width = (width * CONFIG.COMPRESSED_IMAGE_MAX_HEIGHT) / height;
                    height = CONFIG.COMPRESSED_IMAGE_MAX_HEIGHT;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL('image/jpeg', CONFIG.COMPRESSED_IMAGE_QUALITY);

                // 转换为Blob
                canvas.toBlob((blob) => {
                    resolve({
                        dataUrl,
                        blob,
                        width,
                        height
                    });
                }, 'image/jpeg', CONFIG.COMPRESSED_IMAGE_QUALITY);
            };

            img.onerror = () => reject(new Error('图片加载失败'));
            reader.onerror = () => reject(new Error('文件读取失败'));

            reader.readAsDataURL(file);
        });
    }
}

// 全局实例
let imageUploader;
