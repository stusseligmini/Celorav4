# Testing Network Status and WebSocket Reconnection

This script provides steps to test the network status indicators and WebSocket reconnection functionality.

## Prerequisites

- Celora V2 running locally
- Chrome or Firefox browser with developer tools

## Test Network Status Indicator

1. Open the demo page at `/demo/network-status`
2. Observe the different network status indicator variants
3. Test offline detection:
   - Open Chrome DevTools (F12 or Ctrl+Shift+I)
   - Go to Network tab
   - Check "Offline" checkbox to simulate offline mode
   - Verify that status indicators change to "Offline"
   - Uncheck "Offline" to restore connection
   - Verify that status indicators change back to "Online"
4. Test exchange rate updates:
   - Click the "Refresh Exchange Rates" button
   - Verify that the "Last exchange rate update" timestamp updates
   - Wait more than 15 minutes without refreshing
   - Verify that status changes to "Rates outdated"

## Test WebSocket Reconnector

1. Open the demo page at `/demo/network-status`
2. Observe the WebSocket reconnection status
3. Click "Reconnect" to test manual reconnection
4. Test automatic reconnection:
   - In Chrome DevTools Network tab, temporarily disable network
   - Wait for WebSocket to enter "Disconnected" state
   - Re-enable network
   - Verify that WebSocket automatically attempts to reconnect

## Test Currency Components with Network Status

1. Open the demo page at `/demo/network-status`
2. Use the Currency Converter component to convert between currencies
3. Put the browser in offline mode
4. Try to convert currencies again
5. Verify that the conversion still works with cached exchange rates
6. Verify that a visual indicator shows when rates might be stale

## Testing in Real-World Scenarios

1. Test on slow or intermittent connections
2. Test across device sleep/wake cycles
3. Test with VPN connections that may drop periodically
4. Verify that reconnection attempts follow exponential backoff pattern

## Expected Behavior

- NetworkStatusIndicator should accurately reflect connection status
- WebSocketReconnector should attempt to reconnect automatically when disconnected
- Currency conversions should still work offline using cached rates
- Clear visual indicators should show when rates might be stale
- Status should update immediately when connection is restored