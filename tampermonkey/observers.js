window._NetworkObserver = {
    callbacks: new Map(),

    init() {
        // Combined XHR and Fetch interceptor
        const handleResponse = async (url, status, response) => {
            this.callbacks.forEach((callback, pattern) => {
                if (url.includes(pattern)) {
                    callback({
                        success: status >= 200 && status < 300,
                        status,
                        response,
                    });
                }
            });
        };

        // XHR Interceptor
        const XHR = XMLHttpRequest.prototype;
        const originalOpen = XHR.open;
        const originalSend = XHR.send;

        XHR.open = function (method, url) {
            this._url = url;
            return originalOpen.apply(this, arguments);
        };

        XHR.send = function () {
            this.addEventListener("load", () => handleResponse(this._url, this.status, this.response));
            return originalSend.apply(this, arguments);
        };

        // Fetch Interceptor
        window.fetch = new Proxy(window.fetch, {
            apply: async (target, thisArg, args) => {
                try {
                    const response = await target.apply(thisArg, args);
                    const clone = response.clone();
                    const data = await clone.json();
                    handleResponse(response.url, response.status, data);
                    return response;
                } catch (error) {
                    handleResponse(args[0], 0, { error });
                    throw error;
                }
            },
        });
    },

    onRequest(urlPattern, callback) {
        this.callbacks.set(urlPattern, callback);
    },
};
