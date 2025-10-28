# WebMCP + Assistant UI Integration Demo

This demo showcases a **real AI chat interface** with MCP-UI and WebMCP integration. The AI assistant can show interactive UI resources that automatically expose WebMCP tools via Tab Transport.

## 🌟 What This Demo Shows

This is a production-ready example of:

1. **AI Chat Interface** - Built with `assistant-ui` and `@ai-sdk/openai`
2. **MCP Server Integration** - Connects to WebMCP demo server
3. **Automatic Tool Discovery** - WebMCP tools in iframes are auto-discovered
4. **Split Layout** - AI chat on the right, MCP-UI resources on the left
5. **Natural Interaction** - Just ask the AI to show you things!

## 🎯 Layout

```
┌─────────────────────────────────────────┬──────────────────┐
│                                         │                  │
│  Left Side (Larger)                     │  Right Side      │
│  ─────────────────                      │  ──────────      │
│  • MCP-UI Resources                     │  • AI Chat       │
│  • Interactive Iframes                  │  • User Input    │
│  • WebMCP Tool Indicators               │  • Chat History  │
│  • Takes up ~66% of screen              │  • ~33% width    │
│                                         │                  │
└─────────────────────────────────────────┴──────────────────┘
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm installed
- OpenAI API key

### Installation

```bash
# From the root of mcp-ui repository
pnpm install

# Or install just for this demo
cd examples/webmcp-assistant-demo
pnpm install
```

### Configuration

1. **Set up your OpenAI API Key:**

```bash
# Create .env.local file
cp .env.local.example .env.local

# Edit .env.local and add your key
OPENAI_API_KEY=sk-your-key-here
```

2. **Start the demo:**

```bash
# From examples/webmcp-assistant-demo
pnpm dev
```

This will start:
- **MCP Server** on http://localhost:3001
- **Next.js App** on http://localhost:3000

### Usage

1. Open http://localhost:3000 in your browser
2. Chat with the AI assistant in the right panel
3. Try these prompts:
   - "Show me the shopping cart"
   - "Display the analytics dashboard"
   - "I want to see the shopping interface"
   - "Show me sales analytics"

4. Watch as the AI calls tools and renders interactive UIs on the left side!

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js App (localhost:3000)                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  AI Chat (assistant-ui + Vercel AI SDK)               │  │
│  │  - Accepts user messages                              │  │
│  │  - Streams responses from OpenAI                      │  │
│  │  - Has access to MCP tools                            │  │
│  └───────────────┬───────────────────────────────────────┘  │
│                  │                                           │
│                  │ Calls tools via /api/chat                 │
│                  ▼                                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  API Route (/api/chat/route.ts)                       │  │
│  │  - Handles AI streaming                               │  │
│  │  - Defines tools that call MCP server                 │  │
│  │  - Returns UI resources                               │  │
│  └───────────────┬───────────────────────────────────────┘  │
│                  │                                           │
└──────────────────┼───────────────────────────────────────────┘
                   │ HTTP
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  MCP Server (localhost:3001)                                │
│  - Returns UIResources with HTML                            │
│  - HTML contains WebMCP tools (@mcp-b/global)               │
│  - Tools: showShoppingCart, showAnalyticsDashboard          │
└─────────────────────────────────────────────────────────────┘
                   │
                   │ UIResource returned to client
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  UIResourceRenderer (in browser)                            │
│  - Renders HTML in iframe                                   │
│  - TabClientTransport connects to iframe                    │
│  - Auto-discovers WebMCP tools                              │
│  - Parent can call tools (not used in this demo)            │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
webmcp-assistant-demo/
├── src/
│   └── app/
│       ├── api/
│       │   └── chat/
│       │       └── route.ts         # AI chat API route with MCP tools
│       ├── layout.tsx                # Root layout
│       ├── page.tsx                  # Main page with split layout
│       └── globals.css               # Global styles
├── .env.local                        # Environment variables (API keys)
├── package.json
├── tsconfig.json
├── next.config.js
└── README.md                         # This file
```

## 🎨 Key Components

### 1. AI Chat Interface (`page.tsx`)

Uses `assistant-ui` with:
- `useEdgeRuntime()` - Connects to Edge runtime
- `Thread.Messages` - Displays chat messages
- `Thread.Composer` - Input field
- Custom tool UIs for rendering MCP resources

### 2. MCP Tool Definitions (`api/chat/route.ts`)

```typescript
tools: {
  showShoppingCart: tool({
    description: "Display an interactive shopping cart",
    execute: async () => {
      return await callMCPTool("showShoppingCart");
    },
  }),
  showAnalyticsDashboard: tool({
    description: "Display analytics dashboard",
    execute: async () => {
      return await callMCPTool("showAnalyticsDashboard");
    },
  }),
}
```

### 3. Tool UI Renderers

Custom `makeAssistantToolUI` components that:
- Receive tool results from AI
- Extract UIResource from results
- Render with `UIResourceRenderer`
- Connect via `TabClientTransport`
- Display discovered WebMCP tools

## 🔧 How It Works

### Step 1: User Asks AI

User types: "Show me the shopping cart"

### Step 2: AI Decides to Call Tool

OpenAI determines it should call the `showShoppingCart` tool

### Step 3: Tool Calls MCP Server

The tool implementation:
1. Initializes MCP session
2. Calls `tools/call` with tool name
3. Gets back UIResource with HTML

### Step 4: UI Renders in Browser

The tool UI component:
1. Extracts UIResource from result
2. Passes to `UIResourceRenderer`
3. Iframe renders HTML with WebMCP tools
4. `TabClientTransport` connects to iframe
5. Discovers tools automatically

### Step 5: User Sees Interactive UI

- AI message appears in right panel
- Interactive UI appears in left panel
- Green badge shows discovered WebMCP tools
- User can interact with the UI

## 🌟 Features

### Automatic Tool Discovery

```tsx
// WebMCP tools are auto-discovered from iframe
const { tools } = await client.listTools();
// Tools: add_to_cart, remove_from_cart, get_cart_contents, clear_cart
```

### Split Panel Layout

- **Left (66%)**: MCP-UI resources and interactive iframes
- **Right (33%)**: AI chat interface

### Responsive Tool UIs

The tool UIs show:
- Loading states
- WebMCP tool discovery status
- Interactive iframe content
- Clean, professional styling

### Real AI Integration

- Uses OpenAI GPT-4o-mini
- Streams responses in real-time
- Naturally decides when to call tools
- Provides context about what was shown

## 🎯 Example Interactions

### Shopping Cart

**User:** "I want to add items to my cart"

**AI:** *Calls showShoppingCart tool*

**Result:** Interactive shopping cart appears with products, add/remove buttons, and real-time updates

### Analytics

**User:** "Show me the analytics dashboard"

**AI:** *Calls showAnalyticsDashboard tool*

**Result:** Dashboard with sales metrics and user statistics appears

## 🔐 Environment Variables

Required in `.env.local`:

```bash
# OpenAI API Key (required)
OPENAI_API_KEY=sk-your-key-here
```

## 🐛 Troubleshooting

**AI not calling tools:**
- Check OpenAI API key is set correctly
- Try more explicit prompts: "Show me the shopping cart UI"
- Check browser console for errors

**MCP server not responding:**
- Ensure MCP server is running on port 3001
- Check that `dev` script starts both server and client
- Look for "MCP Session initialized" in server logs

**WebMCP tools not discovered:**
- Wait for iframe to fully load (500ms delay)
- Check browser console for connection errors
- Ensure `@mcp-b/global` loaded in iframe

**Iframe not displaying:**
- Check browser console for CSP errors
- Verify UIResource has correct structure
- Check that `result.content[0].resource` exists

## 📚 Technologies Used

- **Next.js 15** - React framework
- **assistant-ui** - AI chat interface components
- **@ai-sdk/openai** - OpenAI integration
- **Vercel AI SDK** - AI streaming and tools
- **@mcp-ui/client** - MCP-UI renderer
- **@mcp-ui/server** - MCP-UI server SDK
- **@mcp-b/transports** - Tab transport for iframe
- **@modelcontextprotocol/sdk** - MCP protocol

## 🚀 Next Steps

Try customizing:

1. **Add new tools** - Create more MCP tools with UIs
2. **Enhance layouts** - Improve the split panel design
3. **Add features** - Implement tool calling from parent
4. **Style improvements** - Customize the chat interface
5. **Error handling** - Add retry logic and better errors

## 📝 License

Apache-2.0 © The MCP-UI Authors
