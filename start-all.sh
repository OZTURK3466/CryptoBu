#!/bin/bash

echo "🚀 Démarrage de la Plateforme Crypto Trading..."

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Variables
PROJECT_DIR=$(pwd)
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
DISCORD_BOT_DIR="$PROJECT_DIR/discord-bot"

# Fonction pour afficher les logs avec timestamp
log() {
    echo -e "${CYAN}[$(date '+%H:%M:%S')]${NC} $1"
}

# Fonction pour tuer tous les processus
cleanup() {
    echo -e "\n${RED}🛑 Arrêt de tous les services...${NC}"
    
    # Tuer les processus Node.js liés au projet
    pkill -f "node.*server.js" 2>/dev/null
    pkill -f "react-scripts start" 2>/dev/null
    pkill -f "node.*bot-simple.js" 2>/dev/null
    pkill -f "nodemon" 2>/dev/null
    
    # Attendre un peu pour que les processus se terminent proprement
    sleep 2
    
    log "${GREEN}✅ Tous les services ont été arrêtés${NC}"
    exit 0
}

# Intercepter Ctrl+C
trap cleanup SIGINT SIGTERM

# Fonction pour vérifier si un port est libre
check_port() {
    local port=$1
    if lsof -i :$port >/dev/null 2>&1; then
        return 1
    else
        return 0
    fi
}

# Fonction pour attendre qu'un port soit libre
wait_for_port_free() {
    local port=$1
    local max_attempts=10
    local attempt=0
    
    while ! check_port $port && [ $attempt -lt $max_attempts ]; do
        log "${YELLOW}⏳ Port $port occupé, attente...${NC}"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    if [ $attempt -eq $max_attempts ]; then
        log "${RED}❌ Port $port toujours occupé après $max_attempts tentatives${NC}"
        return 1
    fi
    return 0
}

# Nettoyage des anciens processus
log "${PURPLE}🧹 Nettoyage des anciens processus...${NC}"
pkill -f "node.*server.js" 2>/dev/null
pkill -f "react-scripts start" 2>/dev/null
pkill -f "node.*bot-simple.js" 2>/dev/null
pkill -f "nodemon" 2>/dev/null

# Attendre que les ports se libèrent
wait_for_port_free 3001
wait_for_port_free 3000
wait_for_port_free 8080

log "${GREEN}✅ Nettoyage terminé${NC}"

# Vérifier que les répertoires existent
if [ ! -d "$BACKEND_DIR" ]; then
    log "${RED}❌ Répertoire backend introuvable: $BACKEND_DIR${NC}"
    exit 1
fi

if [ ! -d "$FRONTEND_DIR" ]; then
    log "${RED}❌ Répertoire frontend introuvable: $FRONTEND_DIR${NC}"
    exit 1
fi

if [ ! -d "$DISCORD_BOT_DIR" ]; then
    log "${RED}❌ Répertoire discord-bot introuvable: $DISCORD_BOT_DIR${NC}"
    exit 1
fi

# Vérifier les fichiers package.json
if [ ! -f "$BACKEND_DIR/package.json" ]; then
    log "${RED}❌ package.json manquant dans le backend${NC}"
    exit 1
fi

if [ ! -f "$FRONTEND_DIR/package.json" ]; then
    log "${RED}❌ package.json manquant dans le frontend${NC}"
    exit 1
fi

if [ ! -f "$DISCORD_BOT_DIR/package.json" ]; then
    log "${RED}❌ package.json manquant dans discord-bot${NC}"
    exit 1
fi

# Créer les répertoires de logs s'ils n'existent pas
mkdir -p "$PROJECT_DIR/logs"

echo -e "\n${CYAN}════════════════════════════════════════${NC}"
echo -e "${CYAN}🚀 DÉMARRAGE DES SERVICES${NC}"
echo -e "${CYAN}════════════════════════════════════════${NC}\n"

# 1. Démarrer le Backend
log "${BLUE}📊 Démarrage du Backend (Port 3001)...${NC}"
cd "$BACKEND_DIR"

# Vérifier si le script dev existe, sinon utiliser start
if grep -q '"dev"' package.json; then
    nohup npm run dev > "$PROJECT_DIR/logs/backend.log" 2>&1 &
    BACKEND_PID=$!
    log "${BLUE}📊 Backend démarré avec npm run dev (PID: $BACKEND_PID)${NC}"
else
    nohup npm start > "$PROJECT_DIR/logs/backend.log" 2>&1 &
    BACKEND_PID=$!
    log "${BLUE}📊 Backend démarré avec npm start (PID: $BACKEND_PID)${NC}"
fi

# Attendre que le backend démarre
sleep 5

# Vérifier si le backend est démarré
if kill -0 $BACKEND_PID 2>/dev/null; then
    log "${GREEN}✅ Backend démarré avec succès${NC}"
else
    log "${RED}❌ Erreur lors du démarrage du backend${NC}"
    log "${RED}📋 Vérifiez les logs: tail -f logs/backend.log${NC}"
    exit 1
fi

cd "$PROJECT_DIR"

# 2. Démarrer le Frontend
log "${GREEN}🌐 Démarrage du Frontend (Port 3000)...${NC}"
cd "$FRONTEND_DIR"

# Démarrer le frontend sans ouvrir le navigateur
BROWSER=none nohup npm start > "$PROJECT_DIR/logs/frontend.log" 2>&1 &
FRONTEND_PID=$!
log "${GREEN}🌐 Frontend démarré (PID: $FRONTEND_PID)${NC}"

# Attendre que le frontend démarre
sleep 8

# Vérifier si le frontend est démarré
if kill -0 $FRONTEND_PID 2>/dev/null; then
    log "${GREEN}✅ Frontend démarré avec succès${NC}"
else
    log "${RED}❌ Erreur lors du démarrage du frontend${NC}"
    log "${RED}📋 Vérifiez les logs: tail -f logs/frontend.log${NC}"
fi

cd "$PROJECT_DIR"

# 3. Démarrer le Bot Discord
log "${YELLOW}🤖 Démarrage du Bot Discord...${NC}"
cd "$DISCORD_BOT_DIR"

# Vérifier si le script simple existe
if grep -q '"simple"' package.json; then
    nohup npm run simple > "$PROJECT_DIR/logs/discord-bot.log" 2>&1 &
    BOT_PID=$!
    log "${YELLOW}🤖 Bot Discord démarré avec npm run simple (PID: $BOT_PID)${NC}"
else
    nohup npm start > "$PROJECT_DIR/logs/discord-bot.log" 2>&1 &
    BOT_PID=$!
    log "${YELLOW}🤖 Bot Discord démarré avec npm start (PID: $BOT_PID)${NC}"
fi

# Attendre que le bot démarre
sleep 3

# Vérifier si le bot est démarré
if kill -0 $BOT_PID 2>/dev/null; then
    log "${GREEN}✅ Bot Discord démarré avec succès${NC}"
else
    log "${YELLOW}⚠️  Le bot Discord pourrait avoir des problèmes${NC}"
    log "${YELLOW}📋 Vérifiez les logs: tail -f logs/discord-bot.log${NC}"
fi

cd "$PROJECT_DIR"

# Affichage final
echo -e "\n${CYAN}════════════════════════════════════════${NC}"
echo -e "${CYAN}✅ TOUS LES SERVICES SONT DÉMARRÉS !${NC}"
echo -e "${CYAN}════════════════════════════════════════${NC}\n"

echo -e "${BLUE}📊 Backend API:${NC}     http://localhost:3001"
echo -e "${GREEN}🌐 Frontend Web:${NC}    http://localhost:3000" 
echo -e "${PURPLE}⚙️  Admin Panel:${NC}     http://localhost:3001/api/admin"
echo -e "${YELLOW}🤖 Bot Discord:${NC}     Connecté (vérifiez Discord)"
echo -e "${PURPLE}🔌 WebSocket:${NC}       ws://localhost:8080"

echo -e "\n${CYAN}📋 LOGS EN TEMPS RÉEL:${NC}"
echo -e "Backend:     ${BLUE}tail -f logs/backend.log${NC}"
echo -e "Frontend:    ${GREEN}tail -f logs/frontend.log${NC}"
echo -e "Discord Bot: ${YELLOW}tail -f logs/discord-bot.log${NC}"

echo -e "\n${CYAN}🔧 COMMANDES UTILES:${NC}"
echo -e "Voir tous les logs: ${PURPLE}tail -f logs/*.log${NC}"
echo -e "Vérifier les ports: ${PURPLE}lsof -i :3000 -i :3001 -i :8080${NC}"
echo -e "Arrêter tout:       ${RED}Ctrl+C${NC}"

echo -e "\n${GREEN}🎉 La plateforme est prête ! Rendez-vous sur http://localhost:3000${NC}"
echo -e "${PURPLE}🔐 Panel Admin accessible sur http://localhost:3001/api/admin${NC}"

echo -e "\n${RED}💡 Appuyez sur Ctrl+C pour arrêter tous les services${NC}"
echo -e "${CYAN}⏳ En attente...${NC}\n"

# Fonction pour vérifier périodiquement les services
monitor_services() {
    while true; do
        sleep 30
        
        # Vérifier le backend
        if ! kill -0 $BACKEND_PID 2>/dev/null; then
            log "${RED}❌ Backend s'est arrêté inattenduement${NC}"
        fi
        
        # Vérifier le frontend
        if ! kill -0 $FRONTEND_PID 2>/dev/null; then
            log "${RED}❌ Frontend s'est arrêté inattenduement${NC}"
        fi
        
        # Vérifier le bot (optionnel car peut planter plus souvent)
        if ! kill -0 $BOT_PID 2>/dev/null; then
            log "${YELLOW}⚠️  Bot Discord s'est arrêté${NC}"
        fi
    done
}

# Démarrer le monitoring en arrière-plan
monitor_services &
MONITOR_PID=$!

# Attendre indéfiniment jusqu'à Ctrl+C
wait