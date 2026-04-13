#!/bin/bash
# Start the PWA server

cd "$(dirname "$0")"

# Check if Flask is installed
if ! python3.12 -c "import flask" 2>/dev/null; then
    echo "Installing Flask..."
    python3.12 -m pip install flask -q
fi

echo "启动 Idea & Todo PWA..."
echo "访问: http://localhost:5000"
echo "手机上: 访问本机IP:5000 (例如: http://192.168.1.100:5000)"
echo ""
echo "按 Ctrl+C 停止服务器"
echo ""

python3.12 app.py
