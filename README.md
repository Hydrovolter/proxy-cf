# CORS-Proxy Cloudflare

A simple Cloudflare Workers script to bypass CORS restrictions for web requests.

**Usage:**

1. Deploy the `workers.js` script to your Cloudflare Workers account.
2. Access the proxy via your worker's subdomain: `your-worker-name.your-namespace.workers.dev/?url=[target-url]`

**Example:**

To fetch data from `https://api.example.com/data`, use:

`your-worker-name.your-namespace.workers.dev/?url=https://api.example.com/data`

> [!NOTE]  
> This is a basic proxy and may not handle all complex scenarios. Therefore many sites may not render all assets properly, and many features will NOT work!
