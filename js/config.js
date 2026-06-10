/**
 * Config - 应用配置
 * 
 * 注意：使用Supabase前需要：
 * 1. 在 https://supabase.com 创建项目
 * 2. 获取项目URL和匿名密钥
 * 3. 将下面的占位符替换为实际值
 */
const CONFIG = {
    // Supabase配置
    SUPABASE_URL: 'https://wopatkzkosfhbowbvsfk.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcGF0a3prb3NmaGJvd2J2c2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NjM5NjcsImV4cCI6MjA5NjEzOTk2N30.1tc-8PNLJHmduBCetV_lYOKzHBRKY858TfBTbiuUdHs',

    // 应用配置
    APP_NAME: '3D工位图管理系统',
    APP_VERSION: '1.0.0',

    // 同步配置
    SYNC_INTERVAL: 30000, // 30秒自动同步
    SYNC_RETRY_DELAY: 5000, // 同步失败5秒后重试
    SYNC_MAX_RETRIES: 3, // 最大重试次数

    // 存储配置
    DB_NAME: 'WorkstationMapDB',
    DB_VERSION: 1,

    // 管理员配置
    ADMIN_EMAIL: 'admin@workstation.com',
    ADMIN_PASSWORD: 'admin123', // 目标密码

    // 默认数据
    DEFAULT_FLOORS: [
        {
            id: 'floor-hangzhou',
            name: 'hangzhou',
            display_name: '杭州办公区',
            sort_order: 1,
            is_active: true
        },
        {
            id: 'floor-shanghai',
            name: 'shanghai',
            display_name: '上海办公区',
            sort_order: 2,
            is_active: true
        },
        {
            id: 'floor-beijing',
            name: 'beijing',
            display_name: '北京办公区',
            sort_order: 3,
            is_active: true
        }
    ],

    DEFAULT_AREAS: [
        { id: 'area-dev', floor_id: 'floor-hangzhou', name: '研发部', color: '#3b82f6' },
        { id: 'area-product', floor_id: 'floor-hangzhou', name: '产品部', color: '#10b981' },
        { id: 'area-design', floor_id: 'floor-hangzhou', name: '设计部', color: '#f59e0b' },
        { id: 'area-hr', floor_id: 'floor-shanghai', name: '人事部', color: '#ef4444' },
        { id: 'area-sales', floor_id: 'floor-shanghai', name: '销售部', color: '#8b5cf6' },
        { id: 'area-admin', floor_id: 'floor-beijing', name: '行政部', color: '#06b6d4' }
    ],

    // 工位默认尺寸
    DEFAULT_SEAT_WIDTH: 40,
    DEFAULT_SEAT_HEIGHT: 40,

    // 缩放配置
    MIN_ZOOM: 0.3,
    MAX_ZOOM: 3,
    ZOOM_STEP: 0.1,

    // 拖拽配置
    DRAG_THRESHOLD: 5, // 拖拽阈值（像素）
    LONG_PRESS_DURATION: 500, // 长按持续时间（毫秒）

    // 通知配置
    NOTIFICATION_DURATION: 3000, // 通知显示时间

    // 图片配置
    MAX_IMAGE_SIZE: 100 * 1024 * 1024, // 100MB（实际上不限制）
    COMPRESSED_IMAGE_QUALITY: 0.9,
    COMPRESSED_IMAGE_MAX_WIDTH: 4000,
    COMPRESSED_IMAGE_MAX_HEIGHT: 4000,
    SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml', 'image/tiff', 'image/x-icon'],

    // 开发模式（设为true可跳过Supabase连接）
    DEV_MODE: false
};

// 导出配置
window.CONFIG = CONFIG;
