import http.server
import ssl
from socketserver import TCPServer

# Set the server address and port
host = "0.0.0.0"  # Binds to all available interfaces
port = 8443       # A common port for HTTPS

# Create a handler to serve files from the current directory
handler = http.server.SimpleHTTPRequestHandler

# Create the HTTPS server
with TCPServer((host, port), handler) as httpd:
    print(f"Serving HTTPS on {host}:{port}")

    # Wrap the socket with SSL context
    # PROTOCOL_TLS_SERVER is generally recommended for server-side
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(certfile="https/cert.pem", keyfile="https/key.pem")
    httpd.socket = context.wrap_socket(httpd.socket, server_side=True)

    # Start the server and keep it running
    httpd.serve_forever()
