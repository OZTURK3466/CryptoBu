#!/bin/bash

echo "🚀 Démarrage de la Plateforme Crypto Trading..."

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Fonction pour tuer tous les processus
cleanup() {
    echo -e "\n${RED}🛑 Arrêt de tous les services...${NC}"
    pkill -f "npm run dev"
    pkill -f "npm start" 
    pkill -f "npm run simple"
    pkill -f "react-scripts"
    pkill -f "nodemon"
    exit
}

# Intercepter Ctrl+C
trap cleanup SIGINT

# Tuer les anciens processus
echo "🧹 Nettoyage des anciens processus..."
pkill -f "npm run dev" 2>/dev/null
pkill -f "npm start" 2>/dev/null
pkill -f "npm run simple" 2>/dev/null
sleep 2

echo -e "${BLUE}📊 Démarrage du Backend...${NC}"
cd backend && npm run dev > ../backend.log 2>&1 &
sleep 3

echo -e "${GREEN}🌐 Démarrage du Frontend...${NC}"
cd frontend && BROWSER=none npm start > ../frontend.log 2>&1 &
sleep 5

echo -e "${YELLOW}🤖 Démarrage du Bot Discord...${NC}"
cd discord-bot && npm run simple > ../bot.log 2>&1 &

echo -e "\n${GREEN}✅ Tous les services sont démarrés !${NC}"
echo -e "${BLUE}📊 Backend:${NC} http://localhost:3001"
echo -e "${GREEN}🌐 Frontend:${NC} http://localhost:3000"
echo -e "${YELLOW}🤖 Bot Discord:${NC} Connecté sur Discord"

echo -e "\n${RED}📋 Pour voir les logs en temps réel :${NC}"
echo -e "Backend: tail -f backend.log"
echo -e "Frontend: tail -f frontend.log"
echo -e "Bot: tail -f bot.log"

echo -e "\n${RED}💡 Appuyez sur Ctrl+C pour arrêter tous les services${NC}\n"

# Attendre que tous les processus se terminent
wait