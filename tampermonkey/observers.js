window._NetworkObserver = {
    callbacks: new Map(),

    init() {
        // Combined XHR and Fetch interceptor
        const handleResponse = async (url, method, status, response) => {
            this.callbacks.forEach((callback, key) => {
                const [patternMethod, patternUrl] = key.split("|");
                if (url.includes(patternUrl) && (patternMethod === "*" || patternMethod.toUpperCase() === method.toUpperCase())) {
                    callback({
                        success: status >= 200 && status < 300,
                        status,
                        method,
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
            this._method = method;
            return originalOpen.apply(this, arguments);
        };

        XHR.send = function () {
            this.addEventListener("load", () => handleResponse(this._url, this._method, this.status, this.response));
            return originalSend.apply(this, arguments);
        };

        // Fetch Interceptor
        window.fetch = new Proxy(window.fetch, {
            apply: async (target, thisArg, args) => {
                const [resource, config = {}] = args;
                const method = config.method || "GET";

                try {
                    const response = await target.apply(thisArg, args);
                    const clone = response.clone();
                    const data = await clone.json();
                    handleResponse(response.url, method, response.status, data);
                    return response;
                } catch (error) {
                    handleResponse(args[0], method, 0, { error });
                    throw error;
                }
            },
        });
    },

    onRequest(urlPattern, method = "*", callback) {
        const key = `${method}|${urlPattern}`;
        this.callbacks.set(key, callback);
    },
};

window.tamper = {
    NetworkObserver: window._NetworkObserver,
    isPopupAllowed: () => {
        try {
            const testWindow = window.open("about:blank", "_blank");
            if (!testWindow || testWindow.closed || typeof testWindow.closed === "undefined") {
                return false;
            }
            testWindow.close();
            return true;
        } catch (e) {
            return false;
        }
    },
};
