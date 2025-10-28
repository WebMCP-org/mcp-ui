import { useState, useEffect, useRef } from 'react';
import { UIResourceRenderer } from '@mcp-ui/client';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { TabClientTransport } from '@mcp-b/transports';
import './App.css';

interface Tool {
  name: string;
  description?: string;
  inputSchema?: {
    type: string;
    properties?: Record<string, unknown>;
  };
}

interface McpResource {
  type: string;
  resource: {
    uri: string;
    mimeType: string;
    text?: string;
    blob?: string;
  };
}

function App() {
  const [mcpResource, setMcpResource] = useState<McpResource | null>(null);
  const [tools, setTools] = useState<Tool[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState<'cart' | 'analytics'>('cart');
  const [toolCallResult, setToolCallResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const clientRef = useRef<Client | null>(null);

  // Fetch UI Resource from MCP server
  const fetchUIResource = async (toolName: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3001/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: {
              name: 'webmcp-demo-client',
              version: '1.0.0',
            },
          },
        }),
      });

      const initResult = await response.json();
      const sessionId = response.headers.get('Mcp-Session-Id');

      // Call the tool
      const toolResponse = await fetch('http://localhost:3001/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'mcp-session-id': sessionId || '',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: {},
          },
        }),
      });

      const toolResult = await toolResponse.json();

      if (toolResult.result?.content?.[0]) {
        setMcpResource(toolResult.result.content[0]);
      }
    } catch (error) {
      console.error('Error fetching UI resource:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Connect to iframe using TabClientTransport
  const connectToIframe = async () => {
    if (!iframeRef.current) return;

    try {
      console.log('🔌 Connecting to iframe with TabClientTransport...');

      const client = new Client(
        {
          name: 'webmcp-demo-host',
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      const transport = new TabClientTransport({
        targetOrigin: window.location.origin,
      });

      await client.connect(transport);
      clientRef.current = client;

      console.log('✅ Connected to iframe!');

      // Discover tools from iframe
      const { tools: discoveredTools } = await client.listTools();
      console.log('🔧 Discovered tools:', discoveredTools);

      setTools(discoveredTools);
      setIsConnected(true);
    } catch (error) {
      console.error('❌ Error connecting to iframe:', error);
    }
  };

  // Call a tool from the iframe
  const callTool = async (toolName: string, args: Record<string, unknown> = {}) => {
    if (!clientRef.current) {
      console.error('No client connected');
      return;
    }

    try {
      console.log(`📞 Calling tool: ${toolName}`, args);
      const result = await clientRef.current.callTool({
        name: toolName,
        arguments: args,
      });

      console.log('📬 Tool result:', result);
      setToolCallResult(JSON.stringify(result, null, 2));

      // Auto-hide result after 5 seconds
      setTimeout(() => setToolCallResult(''), 5000);
    } catch (error) {
      console.error('Error calling tool:', error);
      setToolCallResult(`Error: ${error}`);
    }
  };

  // Load the selected demo
  useEffect(() => {
    const toolName = selectedDemo === 'cart' ? 'showShoppingCart' : 'showAnalyticsDashboard';
    fetchUIResource(toolName);
  }, [selectedDemo]);

  // Connect to iframe when resource is loaded
  useEffect(() => {
    if (mcpResource && iframeRef.current) {
      // Reset connection state
      setIsConnected(false);
      setTools([]);
      clientRef.current = null;

      // Wait for iframe to load, then connect
      const handleLoad = () => {
        // Give the iframe a moment to initialize WebMCP
        setTimeout(() => {
          connectToIframe();
        }, 500);
      };

      const iframe = iframeRef.current;
      iframe.addEventListener('load', handleLoad);

      return () => {
        iframe.removeEventListener('load', handleLoad);
      };
    }
  }, [mcpResource]);

  return (
    <div className="app">
      <header className="header">
        <h1>🎯 MCP-UI + WebMCP Demo</h1>
        <p className="subtitle">
          Interactive demonstration of MCP-UI iframes with WebMCP tool discovery via Tab Transport
        </p>
      </header>

      <div className="demo-selector">
        <button
          className={`demo-btn ${selectedDemo === 'cart' ? 'active' : ''}`}
          onClick={() => setSelectedDemo('cart')}
          disabled={isLoading}
        >
          🛒 Shopping Cart Demo
        </button>
        <button
          className={`demo-btn ${selectedDemo === 'analytics' ? 'active' : ''}`}
          onClick={() => setSelectedDemo('analytics')}
          disabled={isLoading}
        >
          📊 Analytics Dashboard Demo
        </button>
      </div>

      <div className="content">
        <div className="left-panel">
          <div className="status-card">
            <h3>Connection Status</h3>
            <div className={`status ${isConnected ? 'connected' : 'disconnected'}`}>
              {isConnected ? '✅ Connected to iframe' : '⏳ Connecting...'}
            </div>
          </div>

          <div className="tools-card">
            <h3>Discovered Tools ({tools.length})</h3>
            {isConnected && tools.length > 0 ? (
              <div className="tools-list">
                {tools.map((tool) => (
                  <div key={tool.name} className="tool-item">
                    <div className="tool-name">{tool.name}</div>
                    <div className="tool-description">{tool.description}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-tools">
                {isConnected ? 'No tools discovered' : 'Waiting for connection...'}
              </div>
            )}
          </div>

          {selectedDemo === 'cart' && isConnected && (
            <div className="actions-card">
              <h3>Try Calling Tools</h3>
              <button
                className="action-btn"
                onClick={() =>
                  callTool('add_to_cart', {
                    productId: 'test-product',
                    productName: 'Test Product',
                    price: 99,
                    quantity: 1,
                  })
                }
              >
                🛒 Add Test Product
              </button>
              <button className="action-btn" onClick={() => callTool('get_cart_contents')}>
                📋 Get Cart Contents
              </button>
              <button className="action-btn danger" onClick={() => callTool('clear_cart')}>
                🧹 Clear Cart
              </button>
            </div>
          )}

          {selectedDemo === 'analytics' && isConnected && (
            <div className="actions-card">
              <h3>Try Calling Tools</h3>
              <button
                className="action-btn"
                onClick={() =>
                  callTool('get_sales_data', {
                    startDate: '2025-10-01',
                    endDate: '2025-10-28',
                  })
                }
              >
                📊 Get Sales Data
              </button>
              <button className="action-btn" onClick={() => callTool('get_user_stats')}>
                👥 Get User Stats
              </button>
            </div>
          )}

          {toolCallResult && (
            <div className="result-card">
              <h3>Latest Tool Result</h3>
              <pre className="result-output">{toolCallResult}</pre>
            </div>
          )}
        </div>

        <div className="right-panel">
          <div className="iframe-container">
            <h3>UI Resource (Iframe with WebMCP)</h3>
            {isLoading ? (
              <div className="loading">Loading UI resource...</div>
            ) : mcpResource ? (
              <UIResourceRenderer
                ref={iframeRef}
                resource={mcpResource.resource}
                htmlProps={{
                  style: { width: '100%', height: '600px', border: '1px solid #e0e0e0' },
                }}
              />
            ) : (
              <div className="loading">Select a demo to begin</div>
            )}
          </div>

          <div className="info-card">
            <h3>How This Works</h3>
            <ol>
              <li>
                <strong>MCP Server</strong> returns a UIResource with HTML containing WebMCP tools
              </li>
              <li>
                <strong>UIResourceRenderer</strong> renders the HTML in an iframe
              </li>
              <li>
                <strong>TabClientTransport</strong> connects to the iframe via postMessage
              </li>
              <li>
                <strong>Tool Discovery</strong> happens automatically - no manual bridging needed!
              </li>
              <li>
                <strong>Parent App</strong> can call iframe tools using standard MCP protocol
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
