const { createApp } = Vue;

createApp({
    data() {
        return {
            selectedAction: '',
            actionMessage: ''
        }
    },
    methods: {
        handleNavClick(action) {
            console.log('Button clicked with action:', action);
            this.selectedAction = action;
            if (action === 'previous') {
                window.location.href = 'topic.html';
                this.actionMessage = '返回前頁已點擊';
            } else if (action === 'goHome') {
                window.location.href = 'index.html';
                this.actionMessage = '返回首頁';
            }

        }
    }
}).mount('#app');
