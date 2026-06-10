/**
 * QRCodeModal - 二维码弹窗组件
 */
class QRCodeModal {
    constructor() {
        this.modal = document.getElementById('qr-modal');
        this.container = document.getElementById('qr-code-container');
        this.currentCanvas = null;

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

        // 下载按钮
        document.getElementById('download-qr-btn').addEventListener('click', () => {
            this.downloadQR();
        });
    }

    /**
     * 打开弹窗并生成二维码
     */
    async open() {
        this.modal.classList.remove('hidden');
        this.container.innerHTML = '<div class="loading-spinner"></div>';

        try {
            const canvas = await QRGenerator.generateCurrentPage();
            this.currentCanvas = canvas;
            this.container.innerHTML = '';
            this.container.appendChild(canvas);
        } catch (error) {
            this.container.innerHTML = '<p style="color: var(--danger)">生成失败</p>';
            console.error('QR generation failed:', error);
        }
    }

    /**
     * 关闭弹窗
     */
    close() {
        this.modal.classList.add('hidden');
        this.currentCanvas = null;
    }

    /**
     * 下载二维码
     */
    downloadQR() {
        if (this.currentCanvas) {
            QRGenerator.download(this.currentCanvas, 'workstation-qr.png');
        }
    }
}

// 全局实例
let qrCodeModal;
