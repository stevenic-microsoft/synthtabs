(function() {
    if (window.__synthOSChatPanel) return;
    window.__synthOSChatPanel = true;

    // 1. Initial focus
    var chatInput = document.getElementById('chatInput');
    if (chatInput) chatInput.focus();

    // 2. Form submit handler — show overlay + disable inputs
    var chatForm = document.getElementById('chatForm');
    if (chatForm) {
        chatForm.addEventListener('submit', function() {
            var overlay = document.getElementById('loadingOverlay');
            if (overlay) overlay.style.display = 'flex';
            chatForm.action = window.location.pathname;
            setTimeout(function() {
                var ci = document.getElementById('chatInput');
                if (ci) ci.disabled = true;
                var sb = document.querySelector('.chat-submit');
                if (sb) sb.disabled = true;
                document.querySelectorAll('.link-group a').forEach(function(a) {
                    a.style.pointerEvents = 'none';
                    a.style.opacity = '0.5';
                });
            }, 50);
        });
    }

    // 3. Save link handler
    var saveLink = document.getElementById('saveLink');
    if (saveLink) {
        saveLink.addEventListener('click', function() {
            var pageName = prompt('Enter the name of the page to save as:');
            if (pageName) {
                window.location.href = window.location.pathname + '/save?name=' + encodeURIComponent(pageName);
            }
        });
    }

    // 4. Reset link handler
    var resetLink = document.getElementById('resetLink');
    if (resetLink) {
        resetLink.addEventListener('click', function() {
            window.location.href = window.location.pathname + '/reset';
        });
    }

    // 5. Chat scroll to bottom
    var chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        chatMessages.scrollTo({
            top: chatMessages.scrollHeight,
            behavior: 'smooth'
        });
    }

    // 6. Chat toggle button — create, persist in localStorage
    (function() {
        var btn = document.createElement('button');
        btn.className = 'chat-toggle';
        btn.setAttribute('aria-label', 'Toggle chat panel');
        var dots = document.createElement('span');
        dots.className = 'chat-toggle-dots';
        for (var i = 0; i < 3; i++) {
            var dot = document.createElement('span');
            dot.className = 'chat-toggle-dot';
            dots.appendChild(dot);
        }
        btn.appendChild(dots);
        document.body.appendChild(btn);

        var STORAGE_KEY = 'synthos-chat-collapsed';

        if (localStorage.getItem(STORAGE_KEY) === 'true') {
            document.body.classList.add('chat-collapsed');
        }

        btn.addEventListener('click', function() {
            document.body.classList.toggle('chat-collapsed');
            localStorage.setItem(STORAGE_KEY, document.body.classList.contains('chat-collapsed'));
        });
    })();

    // 7. Focus management — prevent viewer content from stealing keystrokes
    (function() {
        var ci = document.getElementById('chatInput');
        var vp = document.getElementById('viewerPanel');
        if (!ci || !vp) return;

        ci.addEventListener('mousedown', function(e) {
            e.stopPropagation();
        });

        ['keydown', 'keyup', 'keypress'].forEach(function(type) {
            document.addEventListener(type, function(e) {
                if (document.activeElement === ci) {
                    e.stopImmediatePropagation();
                }
            }, true);
        });

        vp.setAttribute('tabindex', '-1');
        ci.addEventListener('blur', function() {
            vp.focus();
        });
    })();
})();
