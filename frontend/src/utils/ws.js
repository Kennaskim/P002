export const createWsClient = (path, onMessage) => {
    // 1. Build the WebSocket URL (ws://127.0.0.1:8000/ws/chat/...)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = '127.0.0.1:8000'; // Or your LAN IP if testing on mobile
    const url = `${protocol}//${host}${path}`;

    console.log("Connecting to WS:", url);

    const client = new WebSocket(url);

    client.onopen = () => {
        console.log('WebSocket Connected');
    };

    client.onmessage = (e) => {
        const data = JSON.parse(e.data);
        onMessage(data);
    };

    client.onclose = () => {
        console.log('WebSocket Disconnected');
    };

    client.onerror = (error) => {
        console.error('WebSocket Error:', error);
    };

    return client;
};