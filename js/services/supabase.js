/**
 * SupabaseService - Supabase客户端封装
 * 提供数据库操作和实时同步功能
 */
class SupabaseService {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.realtimeChannels = [];
    }

    /**
     * 初始化Supabase客户端
     */
    async init() {
        // 开发模式下跳过Supabase连接
        if (CONFIG.DEV_MODE) {
            console.log('Dev mode: Skipping Supabase connection');
            this.isConnected = false;
            return false;
        }

        // 如果已经连接，直接返回
        if (this.isConnected && this.client) {
            return true;
        }

        try {
            if (!window.supabase) {
                console.warn('Supabase library not loaded');
                return false;
            }

            this.client = window.supabase.createClient(
                CONFIG.SUPABASE_URL,
                CONFIG.SUPABASE_ANON_KEY
            );

            // 测试连接
            const { data, error } = await this.client.from('floors').select('count').limit(1);
            if (error) throw error;

            this.isConnected = true;
            console.log('Supabase connected');

            // 设置实时订阅
            this.setupRealtimeSubscriptions();

            return true;
        } catch (error) {
            console.error('Supabase connection failed:', error);
            this.isConnected = false;
            return false;
        }
    }

    /**
     * 设置实时订阅
     */
    setupRealtimeSubscriptions() {
        if (!this.client) return;

        // 订阅工位变化
        const seatsChannel = this.client
            .channel('seats-changes')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'seats' },
                (payload) => this.handleRealtimeChange('seats', payload)
            )
            .subscribe();

        // 订阅区域变化
        const areasChannel = this.client
            .channel('areas-changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'areas' },
                (payload) => this.handleRealtimeChange('areas', payload)
            )
            .subscribe();

        // 订阅楼层变化
        const floorsChannel = this.client
            .channel('floors-changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'floors' },
                (payload) => this.handleRealtimeChange('floors', payload)
            )
            .subscribe();

        this.realtimeChannels = [seatsChannel, areasChannel, floorsChannel];
    }

    /**
     * 处理实时数据变化
     */
    handleRealtimeChange(table, payload) {
        console.log(`Realtime ${table} change:`, payload.eventType, payload);
        eventBus.emit('realtime:change', { table, payload });
    }

    /**
     * 获取所有楼层
     */
    async getFloors() {
        if (!this.isConnected) return [];
        const { data, error } = await this.client.from('floors').select('*').order('sort_order');
        if (error) throw error;
        return data || [];
    }

    /**
     * 获取所有区域
     */
    async getAreas() {
        if (!this.isConnected) return [];
        const { data, error } = await this.client.from('areas').select('*');
        if (error) throw error;
        return data || [];
    }

    /**
     * 获取所有工位
     */
    async getSeats() {
        if (!this.isConnected) return [];
        const { data, error } = await this.client.from('seats').select('*');
        if (error) throw error;
        return data || [];
    }

    /**
     * 获取指定楼层的工位
     */
    async getSeatsByFloor(floorId) {
        if (!this.isConnected) return [];
        const { data, error } = await this.client
            .from('seats')
            .select('*')
            .eq('floor_id', floorId);
        if (error) throw error;
        return data || [];
    }

    /**
     * 创建工位
     */
    async createSeat(seatData) {
        if (!this.isConnected) return null;
        const { data, error } = await this.client
            .from('seats')
            .insert([seatData])
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    /**
     * 更新工位
     */
    async updateSeat(id, updates) {
        if (!this.isConnected) return null;
        const { data, error } = await this.client
            .from('seats')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    /**
     * 删除工位
     */
    async deleteSeat(id) {
        if (!this.isConnected) return false;
        const { error } = await this.client.from('seats').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    /**
     * 创建区域
     */
    async createArea(areaData) {
        if (!this.isConnected) return null;
        const { data, error } = await this.client
            .from('areas')
            .insert([areaData])
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    /**
     * 更新区域
     */
    async updateArea(id, updates) {
        if (!this.isConnected) return null;
        const { data, error } = await this.client
            .from('areas')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    /**
     * 删除区域
     */
    async deleteArea(id) {
        if (!this.isConnected) return false;
        const { error } = await this.client.from('areas').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    /**
     * 更新楼层
     */
    async updateFloor(id, updates) {
        if (!this.isConnected) return null;
        const { data, error } = await this.client
            .from('floors')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    /**
     * 上传图片到Storage
     */
    async uploadImage(bucket, path, file) {
        if (!this.isConnected) return null;
        const { data, error } = await this.client.storage
            .from(bucket)
            .upload(path, file, { upsert: true });
        if (error) throw error;
        return data;
    }

    /**
     * 获取图片URL（确保公开访问）
     */
    getImageUrl(bucket, path) {
        if (!this.client) return null;
        const { data } = this.client.storage.from(bucket).getPublicUrl(path);
        let url = data?.publicUrl || null;
        // 确保URL包含正确的公开访问参数
        if (url && !url.includes('token=')) {
            url += '?t=' + Date.now();
        }
        return url;
    }

    /**
     * 管理员登录
     */
    async adminLogin(email, password) {
        if (!this.client) return { success: false, error: 'Supabase not initialized' };
        try {
            const { data, error } = await this.client.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;
            return { success: true, user: data.user, session: data.session };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * 管理员登出
     */
    async adminLogout() {
        if (!this.client) return;
        await this.client.auth.signOut();
    }

    /**
     * 获取当前会话
     */
    async getSession() {
        if (!this.client) return null;
        const { data } = await this.client.auth.getSession();
        return data?.session || null;
    }

    /**
     * 关闭连接
     */
    disconnect() {
        this.realtimeChannels.forEach(channel => {
            if (channel) channel.unsubscribe();
        });
        this.realtimeChannels = [];
        this.isConnected = false;
        this.client = null;
    }
}

// 全局Supabase服务实例
const supabaseService = new SupabaseService();
