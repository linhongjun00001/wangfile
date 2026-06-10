/**
 * LoginModal - 登录弹窗组件
 */
class LoginModal {
    constructor() {
        this.modal = document.getElementById('login-modal');
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

        // 登录按钮
        document.getElementById('login-submit-btn').addEventListener('click', () => {
            this.handleLogin();
        });

        // 表单回车提交
        document.getElementById('login-form').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.handleLogin();
            }
        });
    }

    /**
     * 打开弹窗
     */
    open() {
        this.isOpen = true;
        this.modal.classList.remove('hidden');
        document.getElementById('login-password').value = '';
        document.getElementById('login-password').focus();
    }

    /**
     * 关闭弹窗
     */
    close() {
        this.isOpen = false;
        this.modal.classList.add('hidden');
    }

    /**
     * 处理登录
     */
    async handleLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            notification.error('请输入邮箱和密码');
            return;
        }

        const submitBtn = document.getElementById('login-submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = '登录中...';

        try {
            const result = await authService.login(email, password);
            if (result.success) {
                notification.success('登录成功');
                this.close();
                eventBus.emit('auth:login:success', result.user);
            } else {
                notification.error(result.error || '登录失败');
            }
        } catch (error) {
            notification.error('登录出错: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = '登录';
        }
    }
}

// 全局实例
let loginModal;
