# 3D工位图管理系统

基于原生 JavaScript 的 3D 工位图管理系统，支持 PC 端和移动端，数据同步到 Supabase 云端。

## 功能特性

- 3D 工位分布图展示（SVG + CSS 3D 变换）
- 多园区/区域管理（杭州、上海、北京等）
- 工位 CRUD 操作（添加、编辑、删除、拖拽）
- 员工信息管理与搜索
- 底图上传与显示
- 二维码生成与下载
- 管理员登录与权限控制
- 本地 IndexedDB 缓存 + 云端同步
- 响应式设计，支持移动端
- GitHub Pages 自动部署

## 技术栈

- 前端：原生 HTML5 / CSS3 / JavaScript (ES6+)
- 后端：Supabase (PostgreSQL + Realtime)
- 本地存储：IndexedDB
- 部署：GitHub Pages

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/your-username/workstation-map.git
cd workstation-map
```

### 2. 配置 Supabase

1. 在 [Supabase](https://supabase.com) 创建项目
2. 复制项目 URL 和 Anon Key
3. 修改 `js/config.js` 中的配置：

```javascript
const CONFIG = {
    SUPABASE_URL: 'https://your-project.supabase.co',
    SUPABASE_ANON_KEY: 'your-anon-key',
    DEV_MODE: false  // 关闭开发模式
};
```

### 3. 创建数据库表

在 Supabase SQL Editor 中执行：

```sql
-- 楼层/园区表
CREATE TABLE floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  display_name TEXT,
  sort_order INTEGER DEFAULT 0,
  bg_image_url TEXT,
  width INTEGER,
  height INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 区域表
CREATE TABLE areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id UUID REFERENCES floors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 工位表
CREATE TABLE seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id UUID REFERENCES floors(id) ON DELETE CASCADE,
  area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
  seat_number TEXT NOT NULL,
  x_position DECIMAL(10,2),
  y_position DECIMAL(10,2),
  width DECIMAL(10,2) DEFAULT 40,
  height DECIMAL(10,2) DEFAULT 40,
  rotation DECIMAL(5,2) DEFAULT 0,
  status TEXT DEFAULT 'available',
  occupant_name TEXT,
  occupant_department TEXT,
  occupant_phone TEXT,
  avatar_url TEXT,
  avatar_data TEXT,
  metadata JSONB,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 策略
ALTER TABLE floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE seats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON floors FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON areas FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON seats FOR SELECT USING (true);
```

### 4. 本地预览

```bash
# 使用 Python 简单 HTTP 服务器
python -m http.server 8000

# 或使用 Node.js
npx serve .
```

访问 http://localhost:8000

### 5. 部署到 GitHub Pages

1. 在 GitHub 创建仓库
2. 推送代码到 main 分支
3. 进入 Settings > Pages
4. Source 选择 "GitHub Actions"
5. 自动部署完成后访问 `https://your-username.github.io/workstation-map`

## 管理员登录

- 邮箱：`admin@workstation.com`
- 密码：`admin123`

## 项目结构

```
workstation-map/
├── index.html              # 主入口
├── css/
│   ├── main.css           # 全局样式
│   ├── responsive.css     # 响应式
│   ├── floor-map.css      # 工位图
│   ├── navbar.css         # 导航栏
│   ├── bottom-bar.css     # 底部栏
│   ├── modal.css          # 弹窗
│   └── admin.css          # 管理
├── js/
│   ├── app.js             # 应用入口
│   ├── config.js          # 配置
│   ├── core/              # 核心框架
│   ├── services/          # 服务层
│   ├── components/        # UI组件
│   └── utils/             # 工具函数
├── assets/                # 静态资源
└── .github/workflows/     # CI/CD
```

## 浏览器支持

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## License

MIT
