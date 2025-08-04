const { createApp } = Vue;

createApp({
    data() {
        return {
            isMenuOpen: false,
            selectedAction: '',
            actionMessage: ''
        }
    },
    methods: {
        toggleMenu() {
            this.isMenuOpen = !this.isMenuOpen;
            // 根據圖片，選單開啟或關閉時，底層的文字不需要立即改變，
            // 只有點擊具體選項時才顯示 actionMessage
            if (this.isMenuOpen) {
                this.selectedAction = 'menu'; // 標記選單開啟
                this.actionMessage = '選單已開啟'; // 可以在需要時顯示此訊息
            } else {
                // 選單關閉時，不清除 selectedAction 或 actionMessage，
                // 讓上次點擊的訊息保持顯示
                // this.selectedAction = '';
                // this.actionMessage = '';
            }
        },
        handleNavClick(action) {
            this.selectedAction = action;
            if (action === 'import') {
                window.location.href = 'topic.html';
                this.actionMessage = '進入專案已點擊';
            }
            // 點擊任何選單項目後都關閉選單
            if (this.isMenuOpen) {
                this.isMenuOpen = false;
            }
        }
    }
}).mount('#app');
