// 财税小工具 - 公共脚本
// 版本：2026.03-001

// 税务工具类
const TaxUtils = {
    /**
     * 格式化金额
     * @param {number} amount - 金额
     * @returns {string} 格式化后的金额字符串
     */
    formatMoney(amount) {
        return new Intl.NumberFormat('zh-CN', {
            style: 'currency',
            currency: 'CNY',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    },

    /**
     * 格式化数字（千分位）
     * @param {number} num - 数字
     * @returns {string} 格式化后的数字字符串
     */
    formatNumber(num) {
        return new Intl.NumberFormat('zh-CN').format(num);
    },

    /**
     * 数字转大写金额
     * @param {number} num - 金额
     * @returns {string} 大写金额字符串
     */
    numberToChinese(num) {
        const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
        const units = ['', '拾', '佰', '仟'];
        const bigUnits = ['', '万', '亿', '兆'];

        if (num === 0) return '零元整';
        if (num < 0) return '负' + this.numberToChinese(-num);

        const numStr = Math.floor(num).toString();
        let result = '';
        let zeroCount = 0;

        for (let i = 0; i < numStr.length; i++) {
            const digit = parseInt(numStr[i]);
            const position = numStr.length - 1 - i;
            const unitIndex = position % 4;
            const bigUnitIndex = Math.floor(position / 4);

            if (digit === 0) {
                zeroCount++;
            } else {
                if (zeroCount > 0) {
                    result += '零';
                }
                result += digits[digit] + units[unitIndex];
                zeroCount = 0;
            }

            if (unitIndex === 0 && bigUnitIndex > 0) {
                if (zeroCount < 4) {
                    result += bigUnits[bigUnitIndex];
                }
                zeroCount = 0;
            }
        }

        return result + '元整';
    },

    /**
     * 格式化日期
     * @param {Date|string} date - 日期对象或字符串
     * @param {string} format - 格式化模式
     * @returns {string} 格式化后的日期字符串
     */
    formatDate(date, format = 'YYYY-MM-DD') {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');

        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day);
    },

    /**
     * 解析金额字符串
     * @param {string} str - 金额字符串
     * @returns {number} 金额数值
     */
    parseMoney(str) {
        if (typeof str === 'number') return str;
        return parseFloat(str.replace(/[^\d.-]/g, '')) || 0;
    }
};

// 首页功能
document.addEventListener('DOMContentLoaded', function() {
    // 搜索功能
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const calculatorCards = document.querySelectorAll('.calculator-card');
    const categorySections = document.querySelectorAll('.category-section');

    function performSearch() {
        const keyword = searchInput.value.trim().toLowerCase();
        let hasResults = false;

        if (!keyword) {
            // 显示所有
            calculatorCards.forEach(card => card.closest('.col-md-6, .col-lg-3, .col-lg-4').classList.remove('hidden'));
            categorySections.forEach(section => section.classList.remove('hidden'));
            return;
        }

        // 隐藏所有分类标题
        categorySections.forEach(section => section.classList.add('hidden'));

        calculatorCards.forEach(card => {
            const col = card.closest('.col-md-6, .col-lg-3, .col-lg-4');
            const title = card.querySelector('.card-title').textContent.toLowerCase();
            const desc = card.querySelector('.card-text')?.textContent.toLowerCase() || '';

            if (title.includes(keyword) || desc.includes(keyword)) {
                col.classList.remove('hidden');
                hasResults = true;
                // 显示包含匹配项的分类
                const categorySection = card.closest('.category-section');
                if (categorySection) {
                    categorySection.classList.remove('hidden');
                }
            } else {
                col.classList.add('hidden');
            }
        });

        // 如果热门推荐区域，也在其中搜索
        const hotCards = document.querySelectorAll('.calculator-card.hot');
        hotCards.forEach(card => {
            const col = card.closest('.col-md-6, .col-lg-3');
            const title = card.querySelector('.card-title').textContent.toLowerCase();

            if (title.includes(keyword)) {
                col.classList.remove('hidden');
                hasResults = true;
            } else {
                col.classList.add('hidden');
            }
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', performSearch);
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }

    if (searchBtn) {
        searchBtn.addEventListener('click', performSearch);
    }

    // 分类筛选功能
    const filterButtons = document.querySelectorAll('.filter-buttons .btn');

    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.dataset.filter;

            // 更新按钮状态
            filterButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // 筛选显示
            if (filter === 'all') {
                categorySections.forEach(section => section.classList.remove('hidden'));
            } else {
                categorySections.forEach(section => {
                    if (section.dataset.category === filter) {
                        section.classList.remove('hidden');
                    } else {
                        section.classList.add('hidden');
                    }
                });
            }
        });
    });

    // 回到顶部按钮
    const backToTopBtn = document.getElementById('backToTop');

    if (backToTopBtn) {
        window.addEventListener('scroll', function() {
            if (window.pageYOffset > 300) {
                backToTopBtn.classList.add('show');
            } else {
                backToTopBtn.classList.remove('show');
            }
        });

        backToTopBtn.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // 平滑滚动到锚点
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href !== '#') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });
});

// 导出工具类（供其他页面使用）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TaxUtils;
}
