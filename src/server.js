// Minimal HTTP server for Docker deployment purposes.
// This allows the Docker image to satisfy the server component requirement.

const http = require('http');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', app: 'Gander Extension' }));
});

server.listen(PORT, () => {
    console.log(`Gander server running on port ${PORT}`);
});