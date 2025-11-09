# Nest Deployment Guide - Pokemon Card Scanner API

This guide will help you deploy the FastAPI backend to Hack Club Nest.

## Prerequisites

- ✅ Nest account created and approved
- ✅ SSH access to `hackclub.app`
- ✅ Your Nest username (we'll use `<username>` as placeholder)

## Quick Deploy (One Command)

SSH into Nest and run:

```bash
curl -sSL https://raw.githubusercontent.com/ShreyShingala/Pokemon-Card-Scanning-Webapp/main/nest-deploy/deploy.sh | bash
```

Or follow the manual steps below.

---

## Manual Deployment Steps

### 1. SSH into Nest

```bash
ssh <username>@hackclub.app
```

### 2. Clone the Repository

```bash
cd ~
git clone https://github.com/ShreyShingala/Pokemon-Card-Scanning-Webapp.git
cd Pokemon-Card-Scanning-Webapp
```

### 3. Create Python Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate
```

### 4. Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

This will take several minutes. The ML packages (torch, CLIP, etc.) are large.

### 5. Set Environment Variables

Create a `.env` file in the project root:

```bash
nano .env
```

Add your environment variables (get these from your local `.env`):

```properties
supabaseurl=https://tinksayqyqtcnizrjtme.supabase.co
servicerolekey=<your-service-role-key>
```

Save with `Ctrl+X`, then `Y`, then `Enter`.

### 6. Test the API Locally

```bash
source venv/bin/activate
PORT=8080 uvicorn Image_detection.main:app --host 127.0.0.1 --port 8080
```

Press `Ctrl+C` to stop once you verify it starts successfully.

### 7. Create Systemd Service

Copy the service file to systemd user directory:

```bash
mkdir -p ~/.config/systemd/user
cp nest-deploy/pokemon-api.service ~/.config/systemd/user/
```

Enable and start the service:

```bash
systemctl --user daemon-reload
systemctl --user enable pokemon-api.service
systemctl --user start pokemon-api.service
```

Check the status:

```bash
systemctl --user status pokemon-api.service
```

View logs:

```bash
journalctl --user -u pokemon-api.service -f
```

### 8. Configure Caddy Reverse Proxy

Edit your Caddyfile:

```bash
nano ~/Caddyfile
```

Add this at the end:

```
# Pokemon Card Scanner API
https://<username>.hackclub.app {
    reverse_proxy /api/* localhost:8080
    
    header {
        Access-Control-Allow-Origin *
        Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
        Access-Control-Allow-Headers *
    }
}
```

**Important**: Replace `<username>` with your actual Nest username!

Reload Caddy:

```bash
systemctl --user reload caddy
```

### 9. Test Your Deployment

Your API should now be live at:

```
https://<username>.hackclub.app/api/
```

Test the health endpoint:

```bash
curl https://<username>.hackclub.app/api/
```

You should see: `{"status":"online","service":"Pokemon Card Scanner API"}`

---

## Updating Your Deployment

When you push updates to GitHub:

```bash
ssh <username>@hackclub.app
cd ~/Pokemon-Card-Scanning-Webapp
git pull
systemctl --user restart pokemon-api.service
```

---

## Useful Commands

### Check service status
```bash
systemctl --user status pokemon-api.service
```

### View logs (live)
```bash
journalctl --user -u pokemon-api.service -f
```

### View recent logs
```bash
journalctl --user -u pokemon-api.service -n 100
```

### Restart service
```bash
systemctl --user restart pokemon-api.service
```

### Stop service
```bash
systemctl --user stop pokemon-api.service
```

### Start service
```bash
systemctl --user start pokemon-api.service
```

---

## Frontend Configuration

Update your Vercel frontend environment variable:

```
NEXT_PUBLIC_API_URL=https://<username>.hackclub.app/api
```

---

## Troubleshooting

### Service won't start
```bash
journalctl --user -u pokemon-api.service -n 50
```

### Check if port 8080 is in use
```bash
lsof -i :8080
```

### Kill existing process on port 8080
```bash
pkill -f "uvicorn.*8080"
```

### Python module not found
Make sure you're in the venv:
```bash
cd ~/Pokemon-Card-Scanning-Webapp
source venv/bin/activate
pip install -r requirements.txt
```

### Out of disk space
Check disk usage:
```bash
df -h ~
```

Clean up cache:
```bash
rm -rf ~/.cache/pip
pip cache purge
```

---

## Notes

- Your API runs on port 8080 internally
- Caddy forwards `https://<username>.hackclub.app/api/*` to `localhost:8080`
- The systemd service auto-restarts on failure
- Logs are available via `journalctl`
- CLIP model downloads on first run (~350MB, may take a few minutes)

---

## Support

If you run into issues:
1. Check the logs: `journalctl --user -u pokemon-api.service -f`
2. Ask in #nest on Hack Club Slack
3. Check the Nest Guides: https://guides.hackclub.app/nest/
