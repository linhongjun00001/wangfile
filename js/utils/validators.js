/**
 * Validators - 数据校验工具
 */
const Validators = {
    /**
     * 校验邮箱格式
     */
    email(value) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(value);
    },

    /**
     * 校验非空
     */
    required(value) {
        return value !== undefined && value !== null && String(value).trim() !== '';
    },

    /**
     * 校验最小长度
     */
    minLength(value, min) {
        return String(value).length >= min;
    },

    /**
     * 校验最大长度
     */
    maxLength(value, max) {
        return String(value).length <= max;
    },

    /**
     * 校验数字范围
     */
    range(value, min, max) {
        const num = Number(value);
        return !isNaN(num) && num >= min && num <= max;
    },

    /**
     * 校验手机号（中国大陆）
     */
    phone(value) {
        const regex = /^1[3-9]\d{9}$/;
        return regex.test(value);
    },

    /**
     * 校验UUID格式
     */
    uuid(value) {
        const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return regex.test(value);
    },

    /**
     * 生成UUID
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    /**
     * 校验工位数据
     */
    seat(data) {
        const errors = [];
        if (!this.required(data.seat_number)) {
            errors.push('工位编号不能为空');
        }
        if (!this.range(data.x_position, 0, 10000)) {
            errors.push('X坐标无效');
        }
        if (!this.range(data.y_position, 0, 10000)) {
            errors.push('Y坐标无效');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    },

    /**
     * 校验区域数据
     */
    area(data) {
        const errors = [];
        if (!this.required(data.name)) {
            errors.push('区域名称不能为空');
        }
        if (!this.maxLength(data.name, 50)) {
            errors.push('区域名称不能超过50个字符');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
};

window.Validators = Validators;
