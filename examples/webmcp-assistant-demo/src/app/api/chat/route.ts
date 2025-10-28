import { openai } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { z } from "zod";

// MCP client to call our server
async function callMCPTool(toolName: string, args: Record<string, unknown> = {}) {
  try {
    // Initialize session
    const initResponse = await fetch("http://localhost:3001/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "webmcp-assistant", version: "1.0.0" },
        },
      }),
    });

    await initResponse.json();
    const sessionId = initResponse.headers.get("Mcp-Session-Id");

    if (!sessionId) {
      throw new Error("No session ID received from MCP server");
    }

    // Call the tool
    const toolResponse = await fetch("http://localhost:3001/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "mcp-session-id": sessionId,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: toolName, arguments: args },
      }),
    });

    const toolResult = await toolResponse.json();

    if (toolResult.error) {
      throw new Error(toolResult.error.message);
    }

    return toolResult.result;
  } catch (error) {
    console.error("Error calling MCP tool:", error);
    throw error;
  }
}

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: `You are a helpful assistant with access to a shopping cart and analytics dashboard via MCP-UI and WebMCP.

**Available Tools:**
1. showShoppingCart - Display the shopping cart UI (use first before cart operations)
2. addToCart - Add items to the shopping cart (requires cart to be visible)
3. removeFromCart - Remove items from the shopping cart
4. getCartContents - Get current cart contents
5. clearCart - Clear all items from cart
6. showAnalyticsDashboard - Display analytics (use first before analytics operations)
7. getSalesData - Get sales data for a date range
8. getUserStats - Get user statistics

**Workflow:**
- ALWAYS call showShoppingCart FIRST before using any cart tools (addToCart, removeFromCart, etc.)
- ALWAYS call showAnalyticsDashboard FIRST before using analytics tools
- The UI tools (showShoppingCart, showAnalyticsDashboard) render interfaces with embedded WebMCP tools
- After showing the UI, you can call the embedded tools to interact with them

Important: Explain to users what you're doing as you call tools.`,
    messages,
    tools: {
      showShoppingCart: tool({
        description: "Display an interactive shopping cart interface with WebMCP tools embedded. ALWAYS call this first before using any cart operations.",
        parameters: z.object({}),
        execute: async () => {
          const result = await callMCPTool("showShoppingCart");
          return result;
        },
      }),
      showAnalyticsDashboard: tool({
        description: "Display an analytics dashboard with sales data and user statistics. Call this first before analytics operations.",
        parameters: z.object({}),
        execute: async () => {
          const result = await callMCPTool("showAnalyticsDashboard");
          return result;
        },
      }),
      // WebMCP proxy tools - these return instructions for the client to call iframe tools
      addToCart: tool({
        description: "Add a product to the shopping cart. The cart UI must be visible first (call showShoppingCart). Available products: 'laptop-pro' (Laptop Pro, $1299), 'headphones-wireless' (Wireless Headphones, $199), 'smartphone' (Smartphone, $899).",
        parameters: z.object({
          productId: z.string().describe("Product ID: laptop-pro, headphones-wireless, or smartphone"),
          productName: z.string().describe("Product name: Laptop Pro, Wireless Headphones, or Smartphone"),
          price: z.number().describe("Product price: 1299, 199, or 899"),
          quantity: z.number().default(1).describe("Quantity to add"),
        }),
        execute: async ({ productId, productName, price, quantity }) => {
          // Return a special marker that tells the client to call the iframe tool
          return {
            _webmcpProxy: true,
            toolName: "add_to_cart",
            args: { productId, productName, price, quantity },
            message: `Adding ${quantity} ${productName}(s) to cart...`,
          };
        },
      }),
      removeFromCart: tool({
        description: "Remove a product from the shopping cart. The cart must be visible.",
        parameters: z.object({
          productId: z.string().describe("Product ID to remove"),
        }),
        execute: async ({ productId }) => {
          return {
            _webmcpProxy: true,
            toolName: "remove_from_cart",
            args: { productId },
            message: `Removing product from cart...`,
          };
        },
      }),
      getCartContents: tool({
        description: "Get the current contents of the shopping cart. The cart must be visible.",
        parameters: z.object({}),
        execute: async () => {
          return {
            _webmcpProxy: true,
            toolName: "get_cart_contents",
            args: {},
            message: "Getting cart contents...",
          };
        },
      }),
      clearCart: tool({
        description: "Remove all items from the shopping cart. The cart must be visible.",
        parameters: z.object({}),
        execute: async () => {
          return {
            _webmcpProxy: true,
            toolName: "clear_cart",
            args: {},
            message: "Clearing cart...",
          };
        },
      }),
      getSalesData: tool({
        description: "Get sales data for a date range from the analytics dashboard. The dashboard must be visible first.",
        parameters: z.object({
          startDate: z.string().describe("Start date in YYYY-MM-DD format"),
          endDate: z.string().describe("End date in YYYY-MM-DD format"),
        }),
        execute: async ({ startDate, endDate }) => {
          return {
            _webmcpProxy: true,
            toolName: "get_sales_data",
            args: { startDate, endDate },
            message: `Getting sales data from ${startDate} to ${endDate}...`,
          };
        },
      }),
      getUserStats: tool({
        description: "Get user statistics from the analytics dashboard. The dashboard must be visible first.",
        parameters: z.object({}),
        execute: async () => {
          return {
            _webmcpProxy: true,
            toolName: "get_user_stats",
            args: {},
            message: "Getting user statistics...",
          };
        },
      }),
    },
  });

  return result.toDataStreamResponse();
}
