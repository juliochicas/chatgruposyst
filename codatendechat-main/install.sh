#!/bin/bash
set -e

# ╔══════════════════════════════════════════════════════════╗
# ║           ATENDECHAT - EASY INSTALLER                   ║
# ║  One command to install everything with Docker           ║
# ╚══════════════════════════════════════════════════════════╝

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_banner() {
  echo ""
  echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║       ${GREEN}ATENDECHAT - EASY INSTALLER${BLUE}            ║${NC}"
  echo -e "${BLUE}║       ${NC}v6.0.0 - Docker Edition${BLUE}                ║${NC}"
  echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
  echo ""
}

log_info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ─── Check Docker is installed ───
check_docker() {
  if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed."
    echo ""
    echo "Install Docker with:"
    echo "  curl -fsSL https://get.docker.com | sh"
    echo "  sudo usermod -aG docker \$USER"
    echo ""
    exit 1
  fi

  if ! command -v docker compose &> /dev/null && ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose is not installed."
    exit 1
  fi

  log_ok "Docker found: $(docker --version)"
}

# ─── Generate random password ───
gen_password() {
  openssl rand -base64 24 | tr -d '/+=' | head -c 20
}

gen_secret() {
  openssl rand -base64 32
}

# ─── Collect configuration ───
collect_config() {
  echo ""
  echo -e "${YELLOW}── Configuration ──${NC}"
  echo ""

  # Backend URL
  read -p "Backend URL (e.g., http://yourdomain.com:8080): " BACKEND_URL
  BACKEND_URL=${BACKEND_URL:-http://localhost:8080}

  # Frontend URL
  read -p "Frontend URL (e.g., http://yourdomain.com:3000): " FRONTEND_URL
  FRONTEND_URL=${FRONTEND_URL:-http://localhost:3000}

  # Ports
  read -p "Backend port [8080]: " BACKEND_PORT
  BACKEND_PORT=${BACKEND_PORT:-8080}

  read -p "Frontend port [3000]: " FRONTEND_PORT
  FRONTEND_PORT=${FRONTEND_PORT:-3000}

  # Database
  read -p "Database name [atendechat]: " DB_NAME
  DB_NAME=${DB_NAME:-atendechat}

  read -p "Database user [atendechat]: " DB_USER
  DB_USER=${DB_USER:-atendechat}

  # Auto-generate secure passwords
  DB_PASS=$(gen_password)
  REDIS_PASS=$(gen_password)
  JWT_SECRET=$(gen_secret)
  JWT_REFRESH_SECRET=$(gen_secret)
  ENV_TOKEN=$(gen_secret)

  log_ok "Secure passwords generated automatically"
}

# ─── Create .env files ───
create_env_files() {
  log_info "Creating configuration files..."

  # Root .env (for docker-compose)
  cat > .env << EOF
BACKEND_URL=${BACKEND_URL}
FRONTEND_URL=${FRONTEND_URL}
BACKEND_PORT=${BACKEND_PORT}
FRONTEND_PORT=${FRONTEND_PORT}
DB_USER=${DB_USER}
DB_PASS=${DB_PASS}
DB_NAME=${DB_NAME}
DB_PORT=5432
REDIS_PASS=${REDIS_PASS}
REDIS_PORT=6379
EOF

  # Backend .env
  cat > backend/.env << EOF
NODE_ENV=production
BACKEND_URL=${BACKEND_URL}
FRONTEND_URL=${FRONTEND_URL}
PORT=${BACKEND_PORT}

DB_DIALECT=postgres
DB_HOST=postgres
DB_PORT=5432
DB_USER=${DB_USER}
DB_PASS=${DB_PASS}
DB_NAME=${DB_NAME}

JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}

REDIS_URI=redis://:${REDIS_PASS}@redis:6379
REDIS_OPT_LIMITER_MAX=1
REDIS_OPT_LIMITER_DURATION=3000

ENV_TOKEN=${ENV_TOKEN}

# ─── Email (optional, configure later) ───
#MAIL_HOST="smtp.gmail.com"
#MAIL_USER="your@email.com"
#MAIL_PASS="YourPassword"
#MAIL_FROM="your@email.com"
#MAIL_PORT="465"

# ─── Payment (optional, configure later) ───
#GERENCIANET_SANDBOX=false
#GERENCIANET_CLIENT_ID=Client_Id
#GERENCIANET_CLIENT_SECRET=Client_Secret
#GERENCIANET_PIX_CERT=certificate
#GERENCIANET_PIX_KEY=pix_key
EOF

  # Frontend .env
  cat > frontend/.env << EOF
REACT_APP_BACKEND_URL=${BACKEND_URL}
EOF

  log_ok "Configuration files created"
}

# ─── Build and start ───
start_services() {
  log_info "Building and starting services (this may take a few minutes)..."
  echo ""

  if command -v docker compose &> /dev/null; then
    COMPOSE_CMD="docker compose"
  else
    COMPOSE_CMD="docker-compose"
  fi

  $COMPOSE_CMD build --no-cache
  $COMPOSE_CMD up -d

  echo ""
  log_info "Waiting for services to be ready..."
  sleep 10

  # Check services
  if $COMPOSE_CMD ps | grep -q "Up"; then
    log_ok "All services are running!"
  else
    log_warn "Some services may still be starting. Check with: docker compose ps"
  fi
}

# ─── Print result ───
print_result() {
  echo ""
  echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║         INSTALLATION COMPLETE!               ║${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "  ${BLUE}Frontend:${NC}  ${FRONTEND_URL}"
  echo -e "  ${BLUE}Backend:${NC}   ${BACKEND_URL}"
  echo ""
  echo -e "  ${BLUE}Default login:${NC}"
  echo -e "    Email:    admin@admin.com"
  echo -e "    Password: 123456"
  echo ""
  echo -e "  ${BLUE}API Token:${NC}   ${ENV_TOKEN}"
  echo ""
  echo -e "  ${YELLOW}Commands:${NC}"
  echo -e "    docker compose ps       # Check status"
  echo -e "    docker compose logs -f   # View logs"
  echo -e "    docker compose down      # Stop all"
  echo -e "    docker compose restart   # Restart all"
  echo ""
  echo -e "  ${RED}IMPORTANT: Change the default password after first login!${NC}"
  echo ""
}

# ─── Main ───
main() {
  print_banner
  check_docker
  collect_config
  create_env_files
  start_services
  print_result
}

cd "$(dirname "$0")"
main
