export const createWsClient = (path, onMessage) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = '127.0.0.1:8000'; // Make sure this matches your Django server
    
    // 1. Retrieve the token from localStorage
    const authTokens = JSON.parse(localStorage.getItem('authTokens'));
    const token = authTokens?.access;

    // 2. Append the token as a query parameter to the URL
    // If the token exists, it adds ?token=..., otherwise it just sends ?token=undefined
    const url = `${protocol}//${host}${path}?token=${token}`;

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