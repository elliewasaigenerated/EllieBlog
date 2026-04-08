PORT=8443
if sudo ss -tlnp | grep -q ":$PORT"; then
    echo "HTTPS server is running on port $PORT."
else
    echo "HTTPS server is not running on port $PORT."
    echo "Starting HTTPS server on port $PORT @ $(hostname -I | head -n 1)."
    nohup python3 Blog/https.py > output.log 2>&1 &
fi
cd Blog
code .
"/mnt/c/Program Files/Google/Chrome/Application/chrome.exe" "https://$(hostname -I | head -n 1 | sed -e 's/[[:space:]]*$//'):8443/Blog/src/index.html"