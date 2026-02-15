(function() {
    if (window.__synthOSChatPanel) return;
    window.__synthOSChatPanel = true;

    // 0. Themed tooltips for chat panel controls
    (function() {
        var style = document.createElement('style');
        style.textContent =
            '.synthos-tooltip {' +
                'position: fixed;' +
                'padding: 6px 10px;' +
                'background: var(--bg-tertiary, #0f0f23);' +
                'color: var(--text-secondary, #b794f6);' +
                'border: 1px solid var(--border-color, rgba(138,43,226,0.3));' +
                'border-radius: 6px;' +
                'font-size: 12px;' +
                'max-width: 150px;' +
                'text-align: center;' +
                'pointer-events: none;' +
                'z-index: 10000;' +
                'box-shadow: 0 2px 8px rgba(0,0,0,0.3);' +
                'opacity: 0;' +
                'transition: opacity 0.15s;' +
            '}' +
            '.synthos-tooltip.visible { opacity: 1; }';
        document.head.appendChild(style);

        var tip = document.createElement('div');
        tip.className = 'synthos-tooltip';
        document.body.appendChild(tip);

        function show(el) {
            tip.textContent = el.getAttribute('data-tooltip');
            tip.style.display = 'block';
            tip.classList.remove('visible');
            var r = el.getBoundingClientRect();
            var tw = tip.offsetWidth;
            var left = r.left + (r.width / 2) - (tw / 2);
            if (left < 4) left = 4;
            if (left + tw > window.innerWidth - 4) left = window.innerWidth - tw - 4;
            tip.style.left = left + 'px';
            tip.style.top = (r.top - tip.offsetHeight - 6) + 'px';
            void tip.offsetWidth;
            tip.classList.add('visible');
        }

        function hide() {
            tip.classList.remove('visible');
            tip.style.display = 'none';
        }
        hide();

        function attach(el, text) {
            el.setAttribute('data-tooltip', text);
            el.addEventListener('mouseenter', function() { show(el); });
            el.addEventListener('mouseleave', hide);
        }

        // Pages link is never renamed
        var pagesLink = document.getElementById('pagesLink');
        if (pagesLink) attach(pagesLink, 'Browse all pages');

        // Save and Reset tooltips deferred — locked-mode renames them on DOMContentLoaded
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(function() {
                var s = document.getElementById('saveLink');
                if (s) attach(s, s.textContent.trim() === 'Copy' ? 'Copy page as a new name' : 'Save page as a new name');
                var r = document.getElementById('resetLink');
                if (r) attach(r, r.textContent.trim() === 'Reload' ? 'Reload this page' : 'Reset page to default');
            }, 0);
        });

        window.__synthOSTooltip = attach;
    })();

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

    // 3. Save link handler — themed modal with title, categories, greeting
    (function() {
        var saveLink = document.getElementById('saveLink');
        if (!saveLink) return;

        // Detect if current page is a Builders or System page (start with blank fields)
        var isBuilder = window.pageInfo && Array.isArray(window.pageInfo.categories) &&
            (window.pageInfo.categories.indexOf('Builders') !== -1 ||
             window.pageInfo.categories.indexOf('System') !== -1);

        // Original title for change detection
        var originalTitle = (window.pageInfo && window.pageInfo.title) ? window.pageInfo.title : '';

        // --- Create save modal ---
        var modal = document.createElement('div');
        modal.id = 'saveModal';
        modal.className = 'modal-overlay';
        modal.innerHTML =
            '<div class="modal-content" style="max-width:480px;">' +
                '<div class="modal-header">' +
                    '<span>Save Page</span>' +
                    '<button type="button" class="brainstorm-close-btn" id="saveCloseBtn">&times;</button>' +
                '</div>' +
                '<div class="modal-body" style="display:flex;flex-direction:column;gap:12px;padding:16px 20px;">' +
                    '<div>' +
                        '<label style="display:block;margin-bottom:4px;font-size:13px;color:var(--text-secondary);">Display Title <span style="color:var(--accent-primary);">*</span></label>' +
                        '<input type="text" id="saveTitleInput" class="brainstorm-input" placeholder="Enter a display title..." style="width:100%;box-sizing:border-box;">' +
                        '<div id="saveTitleError" style="color:#ff6b6b;font-size:12px;margin-top:4px;display:none;">Title is required</div>' +
                    '</div>' +
                    '<div>' +
                        '<label style="display:block;margin-bottom:4px;font-size:13px;color:var(--text-secondary);">Categories <span style="color:var(--accent-primary);">*</span></label>' +
                        '<input type="text" id="saveCategoriesInput" class="brainstorm-input" placeholder="e.g. Tool, Game, Utility" style="width:100%;box-sizing:border-box;">' +
                        '<div id="saveCategoriesError" style="color:#ff6b6b;font-size:12px;margin-top:4px;display:none;">At least one category is required</div>' +
                    '</div>' +
                    '<div>' +
                        '<label style="display:block;margin-bottom:4px;font-size:13px;color:var(--text-secondary);">Greeting <span style="font-size:11px;opacity:0.7;">(optional)</span></label>' +
                        '<input type="text" id="saveGreetingInput" class="brainstorm-input" placeholder="Available when title changes" style="width:100%;box-sizing:border-box;" disabled>' +
                        '<div style="font-size:11px;color:var(--text-secondary);margin-top:4px;opacity:0.7;" id="saveGreetingHint">Change the title to enable a custom greeting.</div>' +
                    '</div>' +
                '</div>' +
                '<div class="modal-footer" style="display:flex;justify-content:flex-end;gap:8px;padding:12px 20px;">' +
                    '<button type="button" class="brainstorm-send-btn" id="saveCancelBtn" style="background:transparent;border:1px solid var(--border-color);color:var(--text-secondary);">Cancel</button>' +
                    '<button type="button" class="brainstorm-send-btn" id="saveConfirmBtn">Save</button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(modal);

        // --- Create error modal ---
        var errorModal = document.createElement('div');
        errorModal.id = 'errorModal';
        errorModal.className = 'modal-overlay';
        errorModal.innerHTML =
            '<div class="modal-content" style="max-width:400px;">' +
                '<div class="modal-header">' +
                    '<span>Error</span>' +
                    '<button type="button" class="brainstorm-close-btn" id="errorCloseBtn">&times;</button>' +
                '</div>' +
                '<div class="modal-body" style="padding:16px 20px;">' +
                    '<p id="errorMessage" style="margin:0;color:var(--text-primary);"></p>' +
                '</div>' +
                '<div class="modal-footer" style="display:flex;justify-content:flex-end;padding:12px 20px;">' +
                    '<button type="button" class="brainstorm-send-btn" id="errorOkBtn">OK</button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(errorModal);

        // --- Element references ---
        var titleInput = document.getElementById('saveTitleInput');
        var categoriesInput = document.getElementById('saveCategoriesInput');
        var greetingInput = document.getElementById('saveGreetingInput');
        var greetingHint = document.getElementById('saveGreetingHint');
        var titleError = document.getElementById('saveTitleError');
        var categoriesError = document.getElementById('saveCategoriesError');

        // --- Greeting enable/disable based on title change ---
        titleInput.addEventListener('input', function() {
            var changed = titleInput.value.trim() !== originalTitle;
            greetingInput.disabled = !changed;
            if (changed) {
                greetingInput.placeholder = 'Enter a custom greeting...';
                greetingHint.textContent = 'Replaces the initial Synthos greeting and removes chat history.';
            } else {
                greetingInput.placeholder = 'Available when title changes';
                greetingInput.value = '';
                greetingHint.textContent = 'Change the title to enable a custom greeting.';
            }
        });

        // --- Open modal ---
        function openSaveModal() {
            // Pre-fill fields (blank for Builder pages)
            titleInput.value = isBuilder ? '' : originalTitle;
            categoriesInput.value = isBuilder ? '' : (
                (window.pageInfo && Array.isArray(window.pageInfo.categories))
                    ? window.pageInfo.categories.join(', ')
                    : ''
            );
            greetingInput.value = '';
            greetingInput.disabled = true;
            greetingInput.placeholder = 'Available when title changes';
            greetingHint.textContent = 'Change the title to enable a custom greeting.';
            titleError.style.display = 'none';
            categoriesError.style.display = 'none';
            modal.classList.add('show');
            titleInput.focus();
        }

        function closeSaveModal() {
            modal.classList.remove('show');
        }

        function showError(msg) {
            document.getElementById('errorMessage').textContent = msg;
            errorModal.classList.add('show');
        }

        function closeError() {
            errorModal.classList.remove('show');
        }

        // --- Submit ---
        function submitSave() {
            var title = titleInput.value.trim();
            var cats = categoriesInput.value.trim();
            var greeting = greetingInput.value.trim();
            var valid = true;

            // Validate
            if (!title) {
                titleError.style.display = 'block';
                valid = false;
            } else {
                titleError.style.display = 'none';
            }
            if (!cats) {
                categoriesError.style.display = 'block';
                valid = false;
            } else {
                categoriesError.style.display = 'none';
            }
            if (!valid) return;

            // Parse categories
            var categories = cats.split(',').map(function(c) { return c.trim(); }).filter(Boolean);

            // Disable button during save
            var confirmBtn = document.getElementById('saveConfirmBtn');
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Saving...';

            var body = { title: title, categories: categories };
            if (greeting && !greetingInput.disabled) {
                body.greeting = greeting;
            }

            fetch(window.location.pathname + '/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })
            .then(function(res) {
                return res.json().then(function(data) {
                    return { ok: res.ok, data: data };
                });
            })
            .then(function(result) {
                if (result.ok && result.data.redirect) {
                    window.location.href = result.data.redirect;
                } else {
                    closeSaveModal();
                    showError(result.data.error || 'An unknown error occurred');
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = 'Save';
                }
            })
            .catch(function(err) {
                closeSaveModal();
                showError('Network error: ' + err.message);
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Save';
            });
        }

        // --- Event listeners ---
        saveLink.addEventListener('click', openSaveModal);
        document.getElementById('saveCloseBtn').addEventListener('click', closeSaveModal);
        document.getElementById('saveCancelBtn').addEventListener('click', closeSaveModal);
        document.getElementById('saveConfirmBtn').addEventListener('click', submitSave);
        document.getElementById('errorCloseBtn').addEventListener('click', closeError);
        document.getElementById('errorOkBtn').addEventListener('click', closeError);

        modal.addEventListener('click', function(e) {
            if (e.target === modal) closeSaveModal();
        });
        errorModal.addEventListener('click', function(e) {
            if (e.target === errorModal) closeError();
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                if (modal.classList.contains('show')) closeSaveModal();
                if (errorModal.classList.contains('show')) closeError();
            }
        });

        // Enter key in title/categories inputs triggers save
        titleInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); submitSave(); }
        });
        categoriesInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); submitSave(); }
        });
    })();

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

    // 6. Chat toggle button — create (if not already in markup), persist in localStorage
    (function() {
        var btn = document.querySelector('.chat-toggle');
        if (!btn) {
            btn = document.createElement('button');
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
        }

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

    // 8. Brainstorm — dynamic brainstorming UI (available on every v2 page)
    (function() {
        var chatInput = document.getElementById('chatInput');
        if (!chatInput) return;

        // --- Wrap chatInput in .chat-input-wrapper if not already wrapped ---
        if (!chatInput.parentElement || !chatInput.parentElement.classList.contains('chat-input-wrapper')) {
            var wrapper = document.createElement('div');
            wrapper.className = 'chat-input-wrapper';
            chatInput.parentNode.insertBefore(wrapper, chatInput);
            wrapper.appendChild(chatInput);
        }

        // --- Create brainstorm icon button ---
        var brainstormBtn = document.createElement('button');
        brainstormBtn.type = 'button';
        brainstormBtn.className = 'brainstorm-icon-btn';
        if (window.__synthOSTooltip) window.__synthOSTooltip(brainstormBtn, 'Brainstorm ideas');
        brainstormBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<circle cx="12" cy="12" r="3"></circle>' +
            '<path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>' +
            '</svg>';
        chatInput.parentElement.appendChild(brainstormBtn);

        // --- Create brainstorm modal ---
        var modal = document.createElement('div');
        modal.id = 'brainstormModal';
        modal.className = 'modal-overlay brainstorm-modal';
        modal.innerHTML =
            '<div class="modal-content">' +
                '<div class="modal-header">' +
                    '<span>Brainstorm</span>' +
                    '<button type="button" class="brainstorm-close-btn" id="brainstormCloseBtn">&times;</button>' +
                '</div>' +
                '<div class="brainstorm-messages" id="brainstormMessages"></div>' +
                '<div class="brainstorm-input-row">' +
                    '<input type="text" class="brainstorm-input" id="brainstormInput" placeholder="What\'s on your mind...">' +
                    '<button type="button" class="brainstorm-send-btn" id="brainstormSendBtn">Send</button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(modal);

        // --- State ---
        var brainstormHistory = [];

        // --- Helpers ---
        function openBrainstorm() {
            modal.classList.add('show');
            // Grab text from chat input as initial topic
            var topic = chatInput.value.trim();
            if (topic) {
                chatInput.value = '';
                sendBrainstormText(topic, true);
            } else {
                // No topic — send context-only opener so LLM starts the brainstorm
                sendBrainstormText('', true);
            }
        }

        function closeBrainstorm() {
            modal.classList.remove('show');
            brainstormHistory = [];
            document.getElementById('brainstormMessages').innerHTML = '';
        }

        function scrollBrainstormToBottom() {
            var el = document.getElementById('brainstormMessages');
            el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        }

        function escapeHtml(str) {
            var div = document.createElement('div');
            div.appendChild(document.createTextNode(str));
            return div.innerHTML;
        }

        function appendBrainstormMessage(role, text, prompt, suggestions, isOpener) {
            var div = document.createElement('div');
            div.className = 'brainstorm-message ' + (role === 'user' ? 'brainstorm-user' : 'brainstorm-assistant');
            if (role === 'assistant') {
                var html;
                if (typeof marked !== 'undefined') {
                    html = marked.parse(text);
                } else {
                    html = escapeHtml(text);
                }
                div.innerHTML = '<strong>SynthOS:</strong> ' + html;
                // Clickable suggestion chips
                if (suggestions && suggestions.length > 0) {
                    var chips = document.createElement('div');
                    chips.className = 'brainstorm-suggestions';
                    suggestions.forEach(function(s) {
                        var chip = document.createElement('button');
                        chip.type = 'button';
                        chip.className = 'brainstorm-suggestion-chip';
                        chip.textContent = s;
                        chip.addEventListener('click', function() {
                            submitSuggestion(s);
                        });
                        chips.appendChild(chip);
                    });
                    div.appendChild(chips);
                }
                // "Build It" button — skip on the opener response
                if (prompt && !isOpener) {
                    var btnRow = document.createElement('div');
                    btnRow.className = 'brainstorm-build-row';
                    var buildBtn = document.createElement('button');
                    buildBtn.type = 'button';
                    buildBtn.className = 'brainstorm-build-btn';
                    buildBtn.textContent = 'Build It';
                    buildBtn.setAttribute('data-prompt', prompt);
                    buildBtn.addEventListener('click', function() {
                        chatInput.value = this.getAttribute('data-prompt');
                        closeBrainstorm();
                        chatInput.focus();
                    });
                    btnRow.appendChild(buildBtn);
                    div.appendChild(btnRow);
                }
            } else {
                div.textContent = text;
            }
            document.getElementById('brainstormMessages').appendChild(div);
            scrollBrainstormToBottom();
        }

        function submitSuggestion(text) {
            // Disable old suggestion chips so they can't be double-clicked
            var oldChips = document.querySelectorAll('#brainstormMessages .brainstorm-suggestion-chip');
            for (var i = 0; i < oldChips.length; i++) {
                oldChips[i].disabled = true;
            }
            sendBrainstormText(text, false);
        }

        function getBrainstormContext() {
            var chatEl = document.getElementById('chatMessages');
            var chatHistory = chatEl ? chatEl.innerText : '';
            return '<CHAT_HISTORY>\n' + chatHistory;
        }

        // Send from the input field
        function sendBrainstormMessage() {
            var input = document.getElementById('brainstormInput');
            var text = input.value.trim();
            if (!text) return;
            input.value = '';
            sendBrainstormText(text, false);
        }

        // Core fetch — isOpener=true means this is the initial call when brainstorm opens
        function sendBrainstormText(text, isOpener) {
            var input = document.getElementById('brainstormInput');
            var userMsg = text || (isOpener ? 'Look at the conversation so far and suggest what we could build or improve.' : '');
            if (!userMsg) return;

            // Show user message in chat (skip for auto-generated opener)
            if (text) {
                appendBrainstormMessage('user', text);
            }
            brainstormHistory.push({ role: 'user', content: userMsg });

            var thinking = document.createElement('div');
            thinking.className = 'brainstorm-thinking';
            thinking.id = 'brainstormThinking';
            thinking.textContent = 'Thinking...';
            document.getElementById('brainstormMessages').appendChild(thinking);
            scrollBrainstormToBottom();

            input.disabled = true;
            document.getElementById('brainstormSendBtn').disabled = true;

            fetch('/api/brainstorm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    context: getBrainstormContext(),
                    messages: brainstormHistory
                })
            })
            .then(function(res) {
                if (!res.ok) throw new Error('Brainstorm request failed');
                return res.json();
            })
            .then(function(data) {
                var thinkingEl = document.getElementById('brainstormThinking');
                if (thinkingEl) thinkingEl.remove();

                var response = data.response || 'Sorry, I didn\'t get a response.';
                var prompt = data.prompt || '';
                var suggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
                appendBrainstormMessage('assistant', response, prompt, suggestions, isOpener);
                brainstormHistory.push({
                    role: 'assistant',
                    content: response + '\n\n[Suggested prompt: ' + prompt + ']'
                });
            })
            .catch(function(err) {
                var thinkingEl = document.getElementById('brainstormThinking');
                if (thinkingEl) thinkingEl.remove();
                appendBrainstormMessage('assistant', 'Something went wrong: ' + err.message);
            })
            .finally(function() {
                input.disabled = false;
                document.getElementById('brainstormSendBtn').disabled = false;
                input.focus();
            });
        }

        // --- Event listeners ---
        brainstormBtn.addEventListener('click', openBrainstorm);
        document.getElementById('brainstormCloseBtn').addEventListener('click', closeBrainstorm);

        modal.addEventListener('click', function(e) {
            if (e.target === modal) closeBrainstorm();
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.classList.contains('show')) closeBrainstorm();
        });

        document.getElementById('brainstormSendBtn').addEventListener('click', sendBrainstormMessage);
        document.getElementById('brainstormInput').addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendBrainstormMessage();
            }
        });
    })();
})();
