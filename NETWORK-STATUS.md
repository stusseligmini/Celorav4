# Network Status and WebSocket Reconnection

## Overview

This document provides information about the network status indicators and WebSocket reconnection functionality in Celora V2.

## Components

### NetworkStatusIndicator

The `NetworkStatusIndicator` component shows the current online/offline status and the freshness of exchange rate data. It can be displayed in different variants:

- **Minimal**: Just a colored dot
- **Badge**: Compact status badge with icon and text
- **Full**: Complete status with details about last update time

#### Usage

```tsx
import NetworkStatusIndicator from '@/components/NetworkStatusIndicator';

// Minimal variant
<NetworkStatusIndicator variant="minimal" />

// Badge variant (default)
<NetworkStatusIndicator variant="badge" />

// Full variant with all details
<NetworkStatusIndicator variant="full" />
```

#### Properties

- `className`: Additional CSS classes
- `showText`: Whether to show status text (default: true)
- `showIcon`: Whether to show status icon (default: true)
- `variant`: Display variant - 'minimal', 'badge', or 'full' (default: 'badge')

### WebSocketReconnector

The `WebSocketReconnector` component manages WebSocket connections with automatic reconnection when disconnected. It's used for maintaining real-time data streams like exchange rate updates.

#### Usage

```tsx
import WebSocketReconnector, { ConnectionStatus } from '@/components/WebSocketReconnector';

// Basic usage
<WebSocketReconnector 
  url="wss://api.example.com/rates"
  onMessage={(data) => console.log('Received:', data)}
  onStatusChange={(status) => setConnectionStatus(status)}
/>

// With children and custom configuration
<WebSocketReconnector
  url="wss://api.example.com/rates"
  reconnectInterval={3000}
  maxReconnectAttempts={10}
>
  {(props) => (
    <div>
      Status: {props.connectionStatus}
      <button onClick={props.reconnect}>Reconnect</button>
    </div>
  )}
</WebSocketReconnector>
```

#### Properties

- `url`: WebSocket URL to connect to
- `className`: Additional CSS classes
- `reconnectInterval`: Time in ms between reconnection attempts (default: 5000)
- `maxReconnectAttempts`: Maximum number of reconnect attempts (default: 5)
- `onMessage`: Callback for message events
- `onStatusChange`: Callback for connection status changes
- `children`: Optional children to render with connection props
- `autoConnect`: Whether to connect automatically on mount (default: true)

## Integration with Multi-Currency System

The network status components integrate with the multi-currency system to show when exchange rates may be stale or unavailable due to network connectivity issues. When the network connection is restored, the components can automatically refresh exchange rates.

## Feature Flags

The network components respect the following feature flags:

- `real_time_rates`: Controls whether WebSocket connections for real-time rate updates are enabled
- `exchange_rate_updates`: Controls whether automatic exchange rate updates are enabled

## Demo Page

A demo page showcasing these components is available at `/demo/network-status`.