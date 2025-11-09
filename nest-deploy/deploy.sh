#!/usr/bin/env bash
set -euo pipefail

echo "Pokemon Card Scanner API - Nest Deployment Script"
echo "===================================================="
echo ""

# Get username from current user
USERNAME=$(whoami)
REPO_URL="https://github.com/ShreyShingala/Pokemon-Card-Scanning-Webapp.git"
PROJECT_DIR="$HOME/Pokemon-Card-Scanning-Webapp"

echo "Deploying for user: $USERNAME"
echo "Project directory: $PROJECT_DIR"
echo ""

# Step 1: Clone or update repository
if [ -d "$PROJECT_DIR" ]; then
    echo "Repository already exists, pulling latest changes..."
    cd "$PROJECT_DIR"
    git pull
else
    echo "Cloning repository..."
    cd "$HOME"
    git clone "$REPO_URL"
    cd "$PROJECT_DIR"
fi

echo "Repository ready"
echo ""

# Step 2: Create virtual environment
echo "Setting up Python virtual environment..."
if [ ! -d "$PROJECT_DIR/venv" ]; then
    python3 -m venv venv
    echo "Virtual environment created"
else
    echo "Virtual environment already exists"
fi

echo ""

# Step 3: Install dependencies
echo "Installing Python dependencies (this may take several minutes)..."
source venv/bin/activate
pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet

echo "Dependencies installed"
echo ""

# Step 4: Check for .env file
echo "Checking environment variables..."
if [ ! -f "$PROJECT_DIR/.env" ]; then
    echo "No .env file found!"
    echo ""
    echo "Please create one manually:"
    echo "  nano $PROJECT_DIR/.env"
    echo ""
    echo "Add these variables:"
    echo "  supabaseurl=<your-supabase-url>"
    echo "  servicerolekey=<your-service-role-key>"
    echo ""
    read -p "Press Enter to continue (you can add .env later)..."
else
    echo ".env file exists"
fi

echo ""

# Step 5: Setup systemd service
echo "⚙️  Setting up systemd service..."
mkdir -p "$HOME/.config/systemd/user"

if [ -f "$PROJECT_DIR/nest-deploy/pokemon-api.service" ]; then
    cp "$PROJECT_DIR/nest-deploy/pokemon-api.service" "$HOME/.config/systemd/user/"
    
    systemctl --user daemon-reload
    systemctl --user enable pokemon-api.service
    
    echo "Systemd service configured"
else
    echo "Service file not found at nest-deploy/pokemon-api.service"
    exit 1
fi

echo ""

# Step 6: Start the service
echo "Starting Pokemon API service..."
systemctl --user restart pokemon-api.service

sleep 2

# Check status
if systemctl --user is-active --quiet pokemon-api.service; then
    echo "Service is running!"
else
    echo "Service failed to start. Check logs:"
    echo "   journalctl --user -u pokemon-api.service -n 50"
    exit 1
fi

echo ""

# Step 7: Caddy configuration reminder
echo "IMPORTANT: Configure Caddy reverse proxy"
echo "============================================"
echo ""
echo "Edit your Caddyfile:"
echo "  nano ~/Caddyfile"
echo ""
echo "Add this configuration:"
echo ""
cat << 'EOF'
# Pokemon Card Scanner API
https://<username>.hackclub.app {
    reverse_proxy /api/* localhost:8080
    
    header {
        Access-Control-Allow-Origin *
        Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
        Access-Control-Allow-Headers *
    }
}
EOF
echo ""
echo "Replace <username> with: $USERNAME"
echo ""
echo "Then reload Caddy:"
echo "  systemctl --user reload caddy"
echo ""

# Step 8: Final status
echo "Deployment Complete!"
echo "======================="
echo ""
echo "Service Status:"
systemctl --user status pokemon-api.service --no-pager -l
echo ""
echo "View logs:"
echo "   journalctl --user -u pokemon-api.service -f"
echo ""
echo "After configuring Caddy, your API will be at:"
echo "   https://$USERNAME.hackclub.app/api/"
echo ""
echo "To update later:"
echo "   cd $PROJECT_DIR && git pull && systemctl --user restart pokemon-api.service"
echo ""
