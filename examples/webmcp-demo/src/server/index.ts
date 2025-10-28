import express from 'express';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { createUIResource } from '@mcp-ui/server';
import { randomUUID } from 'crypto';

const app = express();
const port = 3001;

app.use(cors({
  origin: '*',
  exposedHeaders: ['Mcp-Session-Id'],
  allowedHeaders: ['Content-Type', 'mcp-session-id'],
}));
app.use(express.json());

// Map to store transports by session ID
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

// Handle POST requests for client-to-server communication
app.post('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports[sessionId]) {
    // A session already exists; reuse the existing transport
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    // This is a new initialization request. Create a new transport
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sid) => {
        transports[sid] = transport;
        console.log(`MCP Session initialized: ${sid}`);
      },
    });

    // Clean up the transport from our map when the session closes
    transport.onclose = () => {
      if (transport.sessionId) {
        console.log(`MCP Session closed: ${transport.sessionId}`);
        delete transports[transport.sessionId];
      }
    };

    // Create a new server instance for this specific session
    const server = new McpServer({
      name: "webmcp-demo-server",
      version: "1.0.0"
    });

    // Register a tool that returns a shopping cart UI with WebMCP tools
    server.registerTool('showShoppingCart', {
      title: 'Show Shopping Cart with WebMCP',
      description: 'Creates a UI resource with a shopping cart that exposes WebMCP tools via tab transport.',
      inputSchema: {},
    }, async () => {
      const htmlString = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Shopping Cart - WebMCP Demo</title>
    <script src="https://unpkg.com/@mcp-b/global@latest"></script>
    <style>
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        padding: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        min-height: 100vh;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background: white;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      }
      h1 {
        color: #667eea;
        margin-bottom: 8px;
        font-size: 28px;
      }
      .subtitle {
        color: #666;
        margin-bottom: 24px;
        font-size: 14px;
      }
      .cart-items {
        margin-bottom: 24px;
      }
      .cart-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        border-bottom: 1px solid #eee;
        animation: slideIn 0.3s ease-out;
      }
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(-10px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      .cart-item:last-child {
        border-bottom: none;
      }
      .item-name {
        font-weight: 600;
        color: #333;
      }
      .item-quantity {
        color: #666;
        font-size: 14px;
      }
      .item-remove {
        background: #ff4757;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        transition: background 0.2s;
      }
      .item-remove:hover {
        background: #ff3838;
      }
      .empty-cart {
        text-align: center;
        color: #999;
        padding: 40px 20px;
        font-style: italic;
      }
      .products {
        margin-bottom: 24px;
      }
      .product {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        margin-bottom: 8px;
        transition: all 0.2s;
      }
      .product:hover {
        border-color: #667eea;
        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
      }
      .product-info {
        flex: 1;
      }
      .product-name {
        font-weight: 600;
        color: #333;
        margin-bottom: 4px;
      }
      .product-price {
        color: #667eea;
        font-size: 18px;
        font-weight: 700;
      }
      .add-btn {
        background: #667eea;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        transition: background 0.2s;
      }
      .add-btn:hover {
        background: #5568d3;
      }
      .cart-total {
        text-align: right;
        font-size: 20px;
        font-weight: 700;
        color: #667eea;
        padding: 16px;
        border-top: 2px solid #667eea;
        margin-top: 16px;
      }
      .tools-status {
        background: #f0f4ff;
        padding: 12px;
        border-radius: 6px;
        margin-bottom: 20px;
        font-size: 13px;
      }
      .status-badge {
        display: inline-block;
        background: #10b981;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        margin-left: 8px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>🛒 Shopping Cart</h1>
      <p class="subtitle">WebMCP + MCP-UI Integration Demo</p>

      <div class="tools-status">
        <strong>🔧 WebMCP Tools:</strong>
        <span class="status-badge">REGISTERED</span>
        <div style="margin-top: 8px; color: #666; font-size: 12px;">
          Tools: add_to_cart, remove_from_cart, get_cart_contents, clear_cart
        </div>
      </div>

      <div class="products">
        <h3 style="margin-bottom: 12px; color: #333;">Available Products</h3>
        <div class="product">
          <div class="product-info">
            <div class="product-name">💻 Laptop Pro</div>
            <div class="product-price">$1,299</div>
          </div>
          <button class="add-btn" onclick="addProduct('laptop-pro', 'Laptop Pro', 1299)">Add to Cart</button>
        </div>
        <div class="product">
          <div class="product-info">
            <div class="product-name">🎧 Wireless Headphones</div>
            <div class="product-price">$199</div>
          </div>
          <button class="add-btn" onclick="addProduct('headphones-wireless', 'Wireless Headphones', 199)">Add to Cart</button>
        </div>
        <div class="product">
          <div class="product-info">
            <div class="product-name">📱 Smartphone</div>
            <div class="product-price">$899</div>
          </div>
          <button class="add-btn" onclick="addProduct('smartphone', 'Smartphone', 899)">Add to Cart</button>
        </div>
      </div>

      <h3 style="margin-bottom: 12px; color: #333;">Your Cart</h3>
      <div class="cart-items" id="cart-items">
        <div class="empty-cart">Your cart is empty</div>
      </div>
      <div class="cart-total" id="cart-total" style="display: none;">
        Total: $0
      </div>
    </div>

    <script>
      // Initialize cart from localStorage
      let cart = JSON.parse(localStorage.getItem('cart') || '[]');

      // Register WebMCP tools
      if (window.navigator && window.navigator.modelContext) {
        console.log('🔧 Registering WebMCP tools...');

        // Tool: Add to cart
        navigator.modelContext.registerTool({
          name: "add_to_cart",
          description: "Add a product to the shopping cart",
          inputSchema: {
            type: "object",
            properties: {
              productId: {
                type: "string",
                description: "Unique product identifier"
              },
              productName: {
                type: "string",
                description: "Product name"
              },
              price: {
                type: "number",
                description: "Product price"
              },
              quantity: {
                type: "number",
                description: "Quantity to add",
                default: 1
              }
            },
            required: ["productId", "productName", "price"]
          },
          async execute({ productId, productName, price, quantity = 1 }) {
            console.log('🛒 add_to_cart called:', { productId, productName, price, quantity });

            const existingItem = cart.find(item => item.productId === productId);

            if (existingItem) {
              existingItem.quantity += quantity;
            } else {
              cart.push({ productId, productName, price, quantity });
            }

            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartDisplay();

            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  success: true,
                  message: \`Added \${productName} to cart\`,
                  cartSize: cart.length,
                  total: calculateTotal()
                })
              }]
            };
          }
        });

        // Tool: Remove from cart
        navigator.modelContext.registerTool({
          name: "remove_from_cart",
          description: "Remove a product from the shopping cart",
          inputSchema: {
            type: "object",
            properties: {
              productId: {
                type: "string",
                description: "Product ID to remove"
              }
            },
            required: ["productId"]
          },
          async execute({ productId }) {
            console.log('🗑️ remove_from_cart called:', productId);

            const index = cart.findIndex(item => item.productId === productId);
            let removed = null;

            if (index !== -1) {
              removed = cart.splice(index, 1)[0];
              localStorage.setItem('cart', JSON.stringify(cart));
              updateCartDisplay();
            }

            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  success: index !== -1,
                  message: removed ? \`Removed \${removed.productName} from cart\` : 'Product not found',
                  cartSize: cart.length,
                  total: calculateTotal()
                })
              }]
            };
          }
        });

        // Tool: Get cart contents
        navigator.modelContext.registerTool({
          name: "get_cart_contents",
          description: "Get the current contents of the shopping cart",
          inputSchema: {
            type: "object",
            properties: {}
          },
          async execute() {
            console.log('📋 get_cart_contents called');

            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  items: cart,
                  total: calculateTotal(),
                  itemCount: cart.reduce((sum, item) => sum + item.quantity, 0)
                })
              }]
            };
          }
        });

        // Tool: Clear cart
        navigator.modelContext.registerTool({
          name: "clear_cart",
          description: "Remove all items from the shopping cart",
          inputSchema: {
            type: "object",
            properties: {}
          },
          async execute() {
            console.log('🧹 clear_cart called');

            cart = [];
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartDisplay();

            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  success: true,
                  message: 'Cart cleared',
                  cartSize: 0,
                  total: 0
                })
              }]
            };
          }
        });

        console.log('✅ WebMCP tools registered successfully!');
      } else {
        console.warn('⚠️ navigator.modelContext not available');
      }

      // Helper function to calculate total
      function calculateTotal() {
        return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
      }

      // Helper function to update cart display
      function updateCartDisplay() {
        const cartItemsEl = document.getElementById('cart-items');
        const cartTotalEl = document.getElementById('cart-total');

        if (cart.length === 0) {
          cartItemsEl.innerHTML = '<div class="empty-cart">Your cart is empty</div>';
          cartTotalEl.style.display = 'none';
        } else {
          cartItemsEl.innerHTML = cart.map(item => \`
            <div class="cart-item">
              <div>
                <div class="item-name">\${item.productName}</div>
                <div class="item-quantity">Quantity: \${item.quantity} × $\${item.price}</div>
              </div>
              <button class="item-remove" onclick="removeFromCart('\${item.productId}')">Remove</button>
            </div>
          \`).join('');

          const total = calculateTotal();
          cartTotalEl.innerHTML = \`Total: $\${total.toLocaleString()}\`;
          cartTotalEl.style.display = 'block';
        }
      }

      // Function to add product (called from UI buttons)
      function addProduct(productId, productName, price) {
        const existingItem = cart.find(item => item.productId === productId);

        if (existingItem) {
          existingItem.quantity += 1;
        } else {
          cart.push({ productId, productName, price, quantity: 1 });
        }

        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartDisplay();
      }

      // Function to remove from cart (called from UI buttons)
      function removeFromCart(productId) {
        const index = cart.findIndex(item => item.productId === productId);
        if (index !== -1) {
          cart.splice(index, 1);
          localStorage.setItem('cart', JSON.stringify(cart));
          updateCartDisplay();
        }
      }

      // Initialize display
      updateCartDisplay();
    </script>
  </body>
</html>
      `;

      const uiResource = createUIResource({
        uri: 'ui://shopping/cart-webmcp',
        content: { type: 'rawHtml', htmlString },
        encoding: 'text',
      });

      return {
        content: [uiResource],
      };
    });

    // Register a tool that returns an analytics dashboard with WebMCP
    server.registerTool('showAnalyticsDashboard', {
      title: 'Show Analytics Dashboard with WebMCP',
      description: 'Creates a UI resource with an analytics dashboard that exposes WebMCP tools.',
      inputSchema: {},
    }, async () => {
      const htmlString = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Analytics Dashboard - WebMCP Demo</title>
    <script src="https://unpkg.com/@mcp-b/global@latest"></script>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        margin: 0;
        padding: 20px;
        background: #f5f7fa;
      }
      .dashboard {
        max-width: 800px;
        margin: 0 auto;
      }
      h1 {
        color: #2c3e50;
        margin-bottom: 24px;
      }
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }
      .stat-card {
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      .stat-label {
        color: #7f8c8d;
        font-size: 14px;
        margin-bottom: 8px;
      }
      .stat-value {
        color: #2c3e50;
        font-size: 32px;
        font-weight: bold;
      }
      .tools-info {
        background: #e8f5e9;
        padding: 16px;
        border-radius: 8px;
        margin-bottom: 20px;
      }
    </style>
  </head>
  <body>
    <div class="dashboard">
      <h1>📊 Analytics Dashboard</h1>
      <div class="tools-info">
        <strong>WebMCP Tools Available:</strong> get_sales_data, get_user_stats
      </div>
      <div class="stats-grid" id="stats">
        <div class="stat-card">
          <div class="stat-label">Total Sales</div>
          <div class="stat-value">$24,580</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Active Users</div>
          <div class="stat-value">1,234</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Conversion Rate</div>
          <div class="stat-value">3.2%</div>
        </div>
      </div>
    </div>

    <script>
      if (window.navigator && window.navigator.modelContext) {
        navigator.modelContext.registerTool({
          name: "get_sales_data",
          description: "Get sales data for a date range",
          inputSchema: {
            type: "object",
            properties: {
              startDate: { type: "string" },
              endDate: { type: "string" }
            }
          },
          async execute({ startDate, endDate }) {
            const mockData = {
              period: \`\${startDate} to \${endDate}\`,
              totalSales: 24580,
              transactions: 156,
              averageOrderValue: 157.56
            };
            return {
              content: [{ type: "text", text: JSON.stringify(mockData) }]
            };
          }
        });

        navigator.modelContext.registerTool({
          name: "get_user_stats",
          description: "Get user statistics",
          async execute() {
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  activeUsers: 1234,
                  newUsers: 89,
                  returningUsers: 1145
                })
              }]
            };
          }
        });
      }
    </script>
  </body>
</html>
      `;

      const uiResource = createUIResource({
        uri: 'ui://analytics/dashboard-webmcp',
        content: { type: 'rawHtml', htmlString },
        encoding: 'text',
      });

      return {
        content: [uiResource],
      };
    });

    // Connect the server instance to the transport for this session
    await server.connect(transport);
  } else {
    return res.status(400).json({
      error: { message: 'Bad Request: No valid session ID provided' },
    });
  }

  // Handle the client's request using the session's transport
  await transport.handleRequest(req, res, req.body);
});

// A separate, reusable handler for GET and DELETE requests
const handleSessionRequest = async (req: express.Request, res: express.Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    return res.status(404).send('Session not found');
  }

  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
};

// GET handles the long-lived stream for server-to-client messages
app.get('/mcp', handleSessionRequest);

// DELETE handles explicit session termination from the client
app.delete('/mcp', handleSessionRequest);

app.listen(port, () => {
  console.log(`🚀 WebMCP Demo MCP server listening at http://localhost:${port}`);
  console.log(`📝 Connect your MCP client to: http://localhost:${port}/mcp`);
});
