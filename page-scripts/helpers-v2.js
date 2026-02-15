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
        }
    };
})();
