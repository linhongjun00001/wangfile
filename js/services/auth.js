/**
 * AuthService - 认证服务
 * 管理管理员登录状态和权限
 */
class AuthService {
    constructor() {
        this.sessionKey = 'workstation_admin_session';
    }

    /**
     * 检查是否已登录
     */
    isLoggedIn() {
        const session = this.getSession();
        return !!session;
    }

    /**
     * 获取本地会话
     */
    getSession() {
        try {
            const sessionData = localStorage.getItem(this.sessionKey);
            if (!sessionData) return null;

            const session = JSON.parse(sessionData);
            // 检查会话是否过期（7天）
            const expiresAt = new Date(session.expiresAt);
            if (expiresAt < new Date()) {
                this.logout();
                return null;
            }

            return session;
        } catch (error) {
            console.error('Get session error:', error);
            return null;
        }
    }

    /**
     * 保存会话
     */
    saveSession(userData) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7天有效期

        const session = {
            user: userData,
            expiresAt: expiresAt.toISOString(),
            loggedInAt: new Date().toISOString()
        };

        localStorage.setItem(this.sessionKey, JSON.stringify(session));
    }

    /**
     * 管理员登录
     */
    async login(email, password) {
        // 验证邮箱和密码
        if (email !== CONFIG.ADMIN_EMAIL) {
            return { success: false, error: '邮箱或密码错误' };
        }

        if (password !== CONFIG.ADMIN_PASSWORD) {
            return { success: false, error: '邮箱或密码错误' };
        }

        // 如果Supabase已连接，尝试Supabase认证
        if (supabaseService.isConnected) {
            const result = await supabaseService.adminLogin(email, password);
            if (result.success) {
                this.saveSession(result.user);
                appState.set('isAdmin', true);
                appState.set('user', result.user);
                eventBus.emit('auth:login', result.user);
                return { success: true, user: result.user };
            }
            // Supabase认证失败，回退到本地认证
        }

        // 本地认证（开发模式或Supabase不可用）
        const userData = {
            id: 'local-admin',
            email: CONFIG.ADMIN_EMAIL,
            role: 'admin',
            displayName: '管理员'
        };

        this.saveSession(userData);
        appState.set('isAdmin', true);
        appState.set('user', userData);
        eventBus.emit('auth:login', userData);

        return { success: true, user: userData };
    }

    /**
     * 登出
     */
    async logout() {
        localStorage.removeItem(this.sessionKey);

        if (supabaseService.isConnected) {
            await supabaseService.adminLogout();
        }

        appState.set('isAdmin', false);
        appState.set('user', null);
        eventBus.emit('auth:logout');
    }

    /**
     * 初始化认证状态
     */
    async init() {
        const session = this.getSession();
        if (session) {
            appState.set('isAdmin', true);
            appState.set('user', session.user);
        }

        // 如果Supabase已连接，检查Supabase会话
        if (supabaseService.isConnected) {
            const supabaseSession = await supabaseService.getSession();
            if (supabaseSession) {
                appState.set('isAdmin', true);
                appState.set('user', supabaseSession.user);
            }
        }
    }
}

// 全局认证服务实例
const authService = new AuthService();
