/**
 * QRGenerator - 二维码生成工具
 */
const QRGenerator = {
    /**
     * 生成当前页面的二维码
     */
    generateCurrentPage() {
        const url = window.location.href;
        return this.generate(url);
    },

    /**
     * 生成指定内容的二维码
     */
    generate(text, options = {}) {
        const defaultOptions = {
            width: 256,
            height: 256,
            margin: 2,
            color: {
                dark: '#1e293b',
                light: '#ffffff'
            },
            ...options
        };

        return new Promise((resolve, reject) => {
            if (typeof QRCode === 'undefined') {
                reject(new Error('QRCode library not loaded'));
                return;
            }

            const canvas = document.createElement('canvas');
            QRCode.toCanvas(canvas, text, defaultOptions, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(canvas);
                }
            });
        });
    },

    /**
     * 下载二维码图片
     */
    download(canvas, filename = 'qrcode.png') {
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
        link.click();
    },

    /**
     * 生成工位二维码（包含工位信息）
     */
    generateSeatQR(seat) {
        const baseUrl = window.location.origin + window.location.pathname;
        const params = new URLSearchParams({
            seat: seat.id,
            floor: seat.floor_id
        });
        const url = `${baseUrl}#/seat?${params.toString()}`;
        return this.generate(url, { width: 200, height: 200 });
    }
};

window.QRGenerator = QRGenerator;
