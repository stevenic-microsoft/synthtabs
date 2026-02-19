(function() {
    if (window.__synthOSHelpers) return;
    window.__synthOSHelpers = true;

    function _json(method, url, body) {
        var opts = {
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (body !== undefined) {
            opts.body = JSON.stringify(body);
        }
        return fetch(url, opts).then(function(res) {
            var ct = res.headers.get('content-type') || '';
            var isJson = ct.indexOf('application/json') !== -1;
            return (isJson ? res.json() : res.text()).then(function(data) {
                if (!res.ok) {
                    if (res.status === 404 && isJson && data && data.error === 'table_not_found') {
                        return null; // for data.get, return null if the table or row is not found instead of throwing an error
                    }
                    var err = new Error(isJson && data && data.error ? data.error : data);
                    err.status = res.status;
                    throw err;
                }
                return data;
            });
        });
    }

    function _pageName() {
        return (window.pageInfo && window.pageInfo.name) || 'default';
    }

    window.synthos = {
        data: {
            list: function(table, opts) {
                var url = '/api/data/' + encodeURIComponent(_pageName()) + '/' + encodeURIComponent(table);
                if (opts && typeof opts.limit === 'number') {
                    url += '?limit=' + opts.limit;
                    if (typeof opts.offset === 'number') {
                        url += '&offset=' + opts.offset;
                    }
                }
                return _json('GET', url) || [];
            },
            get: function(table, id) {
                return _json('GET', '/api/data/' + encodeURIComponent(_pageName()) + '/' + encodeURIComponent(table) + '/' + encodeURIComponent(id)) || null;
            },
            save: function(table, row) {
                return _json('POST', '/api/data/' + encodeURIComponent(_pageName()) + '/' + encodeURIComponent(table), row);
            },
            remove: function(table, id) {
                return _json('DELETE', '/api/data/' + encodeURIComponent(_pageName()) + '/' + encodeURIComponent(table) + '/' + encodeURIComponent(id));
            }
        },

        generate: {
            image: function(opts) {
                return _json('POST', '/api/generate/image', opts);
            },
            completion: function(opts) {
                return _json('POST', '/api/generate/completion', opts);
            }
        },

        scripts: {
            run: function(id, variables) {
                return _json('POST', '/api/scripts/' + encodeURIComponent(id), variables || {});
            }
        },

        pages: {
            list: function() {
                return _json('GET', '/api/pages');
            },
            get: function(name) {
                return _json('GET', '/api/pages/' + encodeURIComponent(name));
            },
            update: function(name, metadata) {
                return _json('POST', '/api/pages/' + encodeURIComponent(name), metadata);
            },
            remove: function(name) {
                return _json('DELETE', '/api/pages/' + encodeURIComponent(name));
            }
        },

        search: {
            web: function(query, opts) {
                var body = { query: query };
                if (opts) {
                    if (opts.count) body.count = opts.count;
                    if (opts.country) body.country = opts.country;
                    if (opts.freshness) body.freshness = opts.freshness;
                }
                return _json('POST', '/api/search/web', body);
            }
        },

        connectors: {
            call: function(connector, method, path, opts) {
                var body = { connector: connector, method: method, path: path };
                if (opts) {
                    if (opts.headers) body.headers = opts.headers;
                    if (opts.body) body.body = opts.body;
                    if (opts.query) body.query = opts.query;
                }
                return _json('POST', '/api/connectors', body);
            },
            list: function(opts) {
                var url = '/api/connectors';
                var params = [];
                if (opts) {
                    if (opts.category) params.push('category=' + encodeURIComponent(opts.category));
                    if (opts.id) params.push('id=' + encodeURIComponent(opts.id));
                }
                if (params.length) url += '?' + params.join('&');
                return _json('GET', url);
            }
        },

        agents: {
            list: function(opts) {
                var url = '/api/agents';
                var params = [];
                if (opts) {
                    if (typeof opts.enabled === 'boolean') params.push('enabled=' + opts.enabled);
                    if (opts.provider) params.push('provider=' + encodeURIComponent(opts.provider));
                }
                if (params.length) url += '?' + params.join('&');
                return _json('GET', url);
            },
            send: function(agentId, message, attachments) {
                var body = { message: message };
                if (attachments) body.attachments = attachments;
                return _json('POST', '/api/agents/' + encodeURIComponent(agentId) + '/send', body);
            },
            sendStream: function(agentId, message, onEventOrOpts, attachments) {
                // Supports two calling conventions:
                //   sendStream(id, msg, onEvent)                — positional callback
                //   sendStream(id, msg, onEvent, attachments)   — positional callback + attachments
                //   sendStream(id, msg, { onEvent, attachments }) — options object
                var onEvent, atts;
                if (typeof onEventOrOpts === 'function') {
                    onEvent = onEventOrOpts;
                    atts = attachments;
                } else if (onEventOrOpts && typeof onEventOrOpts === 'object') {
                    onEvent = onEventOrOpts.onEvent;
                    atts = onEventOrOpts.attachments;
                }
                var body = { message: message };
                if (atts) body.attachments = atts;
                // Uses fetch + streaming reader for SSE-style streaming
                var aborted = false;
                var controller = new AbortController();
                fetch('/api/agents/' + encodeURIComponent(agentId) + '/stream', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                    signal: controller.signal
                }).then(function(res) {
                    var reader = res.body.getReader();
                    var decoder = new TextDecoder();
                    var buffer = '';
                    function pump() {
                        return reader.read().then(function(result) {
                            if (result.done || aborted) return;
                            buffer += decoder.decode(result.value, { stream: true });
                            var lines = buffer.split('\n');
                            buffer = lines.pop() || '';
                            for (var i = 0; i < lines.length; i++) {
                                var line = lines[i];
                                if (line.indexOf('data: ') === 0) {
                                    var data = line.substring(6);
                                    if (data === '[DONE]') return;
                                    try {
                                        var event = JSON.parse(data);
                                        if (onEvent) onEvent(event);
                                    } catch(e) { /* skip malformed lines */ }
                                }
                            }
                            return pump();
                        });
                    }
                    return pump();
                }).catch(function(err) {
                    if (!aborted && onEvent) onEvent({ kind: 'error', data: err.message });
                });
                return { close: function() { aborted = true; controller.abort(); } };
            },
            chat: {
                send: function(agentId, message, attachments) {
                    return window.synthos.agents.send(agentId, message, attachments);
                },
                sendStream: function(agentId, message, onEventOrOpts, attachments) {
                    return window.synthos.agents.sendStream(agentId, message, onEventOrOpts, attachments);
                },
                history: function(agentId) {
                    return _json('POST', '/api/agents/' + encodeURIComponent(agentId) + '/chat/history', {}).then(function(res) {
                        return res.messages || [];
                    });
                },
                abort: function(agentId) {
                    return _json('POST', '/api/agents/' + encodeURIComponent(agentId) + '/chat/abort', {});
                },
                clear: function(agentId) {
                    return _json('POST', '/api/agents/' + encodeURIComponent(agentId) + '/chat/clear', {});
                }
            },
            isEnabled: function(agentId) {
                return _json('GET', '/api/agents?enabled=true').then(function(agents) {
                    return agents.some(function(a) { return a.id === agentId; });
                });
            },
            getCapabilities: function(agentId) {
                return _json('GET', '/api/agents').then(function(agents) {
                    var agent = agents.find(function(a) { return a.id === agentId; });
                    return agent ? (agent.capabilities || {}) : null;
                });
            }
        }
    };
})();
