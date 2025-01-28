addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
    // Check for password protection
    const isAuthenticated = authenticate(request);
    if (!isAuthenticated) {
        return new Response('Unauthorized', {
            status: 401,
            headers: {
                'WWW-Authenticate': 'Basic realm="Secure Proxy", charset="UTF-8"'
            }
        });
    }

    try {
        const url = new URL(request.url);

        if (url.pathname === "/") {
            return new Response(getRootHtml(), {
                headers: {
                    'Content-Type': 'text/html; charset=utf-8'
                }
            });
        }

        let actualUrlStr = decodeURIComponent(url.pathname.replace("/", ""));
        actualUrlStr = ensureProtocol(actualUrlStr, url.protocol);
        actualUrlStr += url.search;

        const newHeaders = filterHeaders(request.headers, name => !name.startsWith('cf-'));

        const modifiedRequest = new Request(actualUrlStr, {
            headers: newHeaders,
            method: request.method,
            body: request.body,
            redirect: 'manual'
        });

        const response = await fetch(modifiedRequest);
        let body = response.body;

        if ([301, 302, 303, 307, 308].includes(response.status)) {
            body = response.body;
            return handleRedirect(response, body);
        } else if (response.headers.get("Content-Type")?.includes("text/html")) {
            body = await handleHtmlContent(response, url.protocol, url.host, actualUrlStr);
        }

        const modifiedResponse = new Response(body, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
        });

        setNoCacheHeaders(modifiedResponse.headers);
        setCorsHeaders(modifiedResponse.headers);

        return modifiedResponse;
    } catch (error) {
        return jsonResponse({
            error: error.message
        }, 500);
    }
}

// Authenticate user using Basic Authentication
function authenticate(request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return false;
    }

    const encodedCredentials = authHeader.split(' ')[1];
    const decodedCredentials = atob(encodedCredentials);
    const [username, password] = decodedCredentials.split(':');

    // Hardcoded username and password
    const validUsername = 'admin';
    const validPassword = '1234';

    return username === validUsername && password === validPassword;
}

function ensureProtocol(url, defaultProtocol) {
    return url.startsWith("http://") || url.startsWith("https://") ? url : defaultProtocol + "//" + url;
}

function handleRedirect(response, body) {
    const location = new URL(response.headers.get('location'));
    const modifiedLocation = `/${encodeURIComponent(location.toString())}`;
    return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
            ...response.headers,
            'Location': modifiedLocation
        }
    });
}

async function handleHtmlContent(response, protocol, host, actualUrlStr) {
    const originalText = await response.text();
    const regex = new RegExp('((href|src|action)=["\'])/(?!/)', 'g');
    let modifiedText = replaceRelativePaths(originalText, protocol, host, new URL(actualUrlStr).origin);

    return modifiedText;
}

function replaceRelativePaths(text, protocol, host, origin) {
    const regex = new RegExp('((href|src|action)=["\'])/(?!/)', 'g');
    return text.replace(regex, `$1${protocol}//${host}/${origin}/`);
}

function jsonResponse(data, status) {
    return new Response(JSON.stringify(data), {
        status: status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8'
        }
    });
}

function filterHeaders(headers, filterFunc) {
    return new Headers([...headers].filter(([name]) => filterFunc(name)));
}

function setNoCacheHeaders(headers) {
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');
    headers.set('Surrogate-Control', 'no-store');
}

function setCorsHeaders(headers) {
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    headers.set('Access-Control-Allow-Headers', '*');
}

function getRootHtml() {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Simple Proxy App</title>
        <style>
            :root {
                --primary: rgb(35, 35, 35);
                --secondary: rgb(25, 25, 25);
                --primary-accent: rgb(250, 250, 250);
                --secondary-accent: rgb(150, 150, 150);
                --highlight: rgb(45, 45, 45);
            }

            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-family: "Roboto Mono", monospace;
            }

            body, html {
                width: 100%;
                height: 100%;
                background-color: var(--primary);
                color: var(--primary-accent);
                display: flex;
                justify-content: center;
                align-items: center;
            }

            .container {
                display: flex;
                flex-direction: column;
                gap: 20px;
                max-width: 600px;
                width: 90%;
                padding: 20px;
                background-color: var(--secondary);
                border-radius: 15px;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
            }

            .title {
                font-size: 1.8rem;
                text-align: center;
                color: var(--primary-accent);
            }

            .form-group {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .form-input {
                padding: 10px;
                border: none;
                border-radius: 10px;
                background-color: var(--highlight);
                color: var(--primary-accent);
                font-size: 1rem;
            }

            .form-input::placeholder {
                color: var(--secondary-accent);
            }

            .btn {
                margin-top: 10px;
                padding: 10px;
                background-color: var(--primary);
                color: var(--primary-accent);
                border: none;
                border-radius: 10px;
                cursor: pointer;
                text-align: center;
                font-size: 1rem;
                transition: transform 0.3s ease, box-shadow 0.3s ease;
            }

            .btn:hover {
                transform: scale(1.05);
                box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
            }

            .footer {
                text-align: center;
                font-size: 0.9rem;
                color: var(--secondary-accent);
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1 class="title">Simple Proxy App</h1>
            <form id="proxyForm" onsubmit="redirectToProxy(event)">
                <div class="form-group">
                    <input type="text" id="targetUrl" class="form-input" placeholder="Enter the website URL..." required>
                </div>
                <button type="submit" class="btn">Go to Proxy</button>
            </form>
            <div class="footer">Made by Hydrovolter</div>
        </div>

        <script>
            function redirectToProxy(event) {
                event.preventDefault();
                const targetUrl = document.getElementById('targetUrl').value.trim();
                const currentOrigin = window.location.origin;
                window.open(currentOrigin + '/' + encodeURIComponent(targetUrl), '_blank');
            }
        </script>
    </body>
    </html>
    `;
}
