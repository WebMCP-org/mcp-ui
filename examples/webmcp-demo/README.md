# MCP-UI + WebMCP Integration Demo

This demo showcases the powerful integration between **MCP-UI** and **WebMCP** using Tab Transport for automatic tool discovery.

## 🌟 What This Demo Shows

This demo demonstrates a novel integration pattern where:

1. **MCP Server** returns UIResources (HTML iframes) that contain WebMCP tools
2. **WebMCP Tools** are registered inside the iframe using `navigator.modelContext.registerTool()`
3. **Tab Transport** automatically discovers these tools - no manual bridging needed!
4. **Parent Application** can call iframe tools using standard MCP protocol

## 🎯 Key Features

- **Shopping Cart Demo**: Interactive shopping cart with WebMCP tools for:
  - `add_to_cart` - Add products to cart
  - `remove_from_cart` - Remove products from cart
  - `get_cart_contents` - Get current cart contents
  - `clear_cart` - Clear all items from cart

- **Analytics Dashboard Demo**: Dashboard with WebMCP tools for:
  - `get_sales_data` - Get sales data for date ranges
  - `get_user_stats` - Get user statistics

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and pnpm installed
- Modern browser with JavaScript enabled

### Installation

```bash
# Install dependencies (from the root of mcp-ui repository)
pnpm install

# Or install just for this demo
cd examples/webmcp-demo
pnpm install
```

### Running the Demo

The demo consists of two parts that need to run simultaneously:

**Option 1: Run both server and client together (recommended)**

```bash
pnpm dev
```

**Option 2: Run server and client separately**

```bash
# Terminal 1 - Start the MCP server
pnpm dev:server

# Terminal 2 - Start the client application
pnpm dev:client
```

Then open your browser to:
- **Client App**: http://localhost:5173
- **MCP Server**: http://localhost:3001/mcp

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Parent Application (React + TabClientTransport)       │
│                                                         │
│  ┌───────────────────────────────────────────────┐     │
│  │  MCP Client with TabClientTransport           │     │
│  │  - Connects to iframe via postMessage         │     │
│  │  - Discovers tools automatically               │     │
│  │  - Calls tools using MCP protocol              │     │
│  └───────────────────────────────────────────────┘     │
│                        │                                │
│                        │ postMessage                    │
│                        ▼                                │
│  ┌───────────────────────────────────────────────┐     │
│  │  Iframe (UIResource from MCP Server)          │     │
│  │                                                │     │
│  │  HTML + WebMCP Tools:                          │     │
│  │  - @mcp-b/global loaded                        │     │
│  │  - navigator.modelContext.registerTool()       │     │
│  │  - Tools automatically exposed to parent       │     │
│  └───────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
                        ▲
                        │ HTTP
                        │
              ┌─────────┴─────────┐
              │   MCP Server      │
              │   (Express)       │
              │                   │
              │  Returns UIResource│
              │  with HTML+WebMCP │
              └───────────────────┘
```

## 📁 Project Structure

```
webmcp-demo/
├── src/
│   ├── server/
│   │   └── index.ts          # MCP server that returns UIResources
│   └── client/
│       ├── App.tsx            # React app with TabClientTransport
│       ├── App.css            # Styles
│       ├── main.tsx           # Entry point
│       └── index.css          # Global styles
├── index.html                 # HTML template
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
├── vite.config.ts             # Vite config
└── README.md                  # This file
```

## 🔧 How It Works

### 1. Server Returns HTML with WebMCP

The MCP server (`src/server/index.ts`) returns a UIResource containing HTML with WebMCP tools:

```typescript
const htmlString = `
  <!DOCTYPE html>
  <html>
    <head>
      <script src="https://unpkg.com/@mcp-b/global@latest"></script>
    </head>
    <body>
      <script>
        // Register WebMCP tools
        navigator.modelContext.registerTool({
          name: "add_to_cart",
          description: "Add product to shopping cart",
          inputSchema: { /* ... */ },
          async execute({ productId, quantity }) {
            // Tool implementation
          }
        });
      </script>
    </body>
  </html>
`;

const uiResource = createUIResource({
  uri: 'ui://shopping/cart',
  content: { type: 'rawHtml', htmlString },
  encoding: 'text',
});
```

### 2. Client Renders and Connects

The client app (`src/client/App.tsx`) renders the UIResource in an iframe and connects using TabClientTransport:

```typescript
// Render the UIResource
<UIResourceRenderer
  ref={iframeRef}
  resource={mcpResource.resource}
/>

// Connect to iframe
const client = new Client({ name: 'host' }, { capabilities: {} });
const transport = new TabClientTransport({
  targetOrigin: window.location.origin
});
await client.connect(transport);

// Discover tools automatically
const { tools } = await client.listTools();
```

### 3. Call Tools

Once connected, the parent can call iframe tools using standard MCP:

```typescript
const result = await client.callTool({
  name: 'add_to_cart',
  arguments: {
    productId: 'laptop-123',
    productName: 'Laptop Pro',
    price: 1299,
    quantity: 1
  }
});
```

## 🎨 Demo Features

### Interactive UI
- Click "Add to Cart" buttons to add products
- See the cart update in real-time
- Remove items or clear the entire cart

### Tool Discovery
- Watch as tools are automatically discovered when the iframe loads
- See the list of available tools in the left panel

### Tool Calling
- Click action buttons to call tools programmatically
- See the results displayed in real-time
- Observe both UI updates and MCP responses

## 📦 Dependencies

Key dependencies used in this demo:

- `@mcp-ui/server` - Create UIResources on the MCP server
- `@mcp-ui/client` - Render UIResources in the client
- `@mcp-b/transports` - Tab transport for iframe communication
- `@mcp-b/global` - WebMCP polyfill (loaded via CDN in iframe)
- `@modelcontextprotocol/sdk` - MCP SDK for client and server

## 🔐 Security Notes

- The demo uses `targetOrigin: window.location.origin` for same-origin communication
- In production, use specific origins instead of wildcards
- Validate all tool inputs on both iframe and parent sides
- Be aware that iframes can register any tools they want

## 🐛 Troubleshooting

**Tools not discovered:**
- Check browser console for errors
- Ensure `@mcp-b/global` loaded successfully in the iframe
- Verify the iframe has fully loaded before connecting

**Connection timeout:**
- Increase the timeout in `connectToIframe()` function
- Check that both server and client are running
- Verify no CORS issues in browser console

**Tool calls failing:**
- Check the tool name matches exactly
- Verify the arguments match the inputSchema
- Look for errors in both parent and iframe consoles

## 🚀 Next Steps

Try customizing the demo:

1. **Add new tools** to the iframe
2. **Create custom UIResources** with different functionality
3. **Implement bidirectional communication** patterns
4. **Add authentication** and security checks
5. **Build your own mini-app** with WebMCP tools

## 📚 Learn More

- [MCP-UI Documentation](https://mcpui.dev)
- [WebMCP Documentation](https://webmcp.org)
- [Model Context Protocol](https://modelcontextprotocol.io)

## 📝 License

Apache-2.0 © The MCP-UI Authors
