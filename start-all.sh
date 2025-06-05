#!/bin/bash

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Variables globales
PROJECT_DIR=$(pwd)
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
DISCORD_BOT_DIR="$PROJECT_DIR/discord-bot"
BACKEND_PID=""
FRONTEND_PID=""
BOT_PID=""
MONITOR_PID=""
COMMAND_PID=""

# Fonction pour afficher les logs avec timestamp
log() {
    echo -e "${CYAN}[$(date '+%H:%M:%S')]${NC} $1"
}

# Fonction pour tuer tous les processus
cleanup() {
    echo -e "\n${RED}🛑 Arrêt de tous les services...${NC}"
    
    # Désactiver les notifications de jobs
    set +m
    
    # Arrêter le monitoring silencieusement
    if [ ! -z "$MONITOR_PID" ] && kill -0 $MONITOR_PID 2>/dev/null; then
        kill -9 $MONITOR_PID >/dev/null 2>&1
        wait $MONITOR_PID 2>/dev/null
    fi
    
    # Arrêter l'écoute des commandes silencieusement
    if [ ! -z "$COMMAND_PID" ] && kill -0 $COMMAND_PID 2>/dev/null; then
        kill -9 $COMMAND_PID >/dev/null 2>&1
        wait $COMMAND_PID 2>/dev/null
    fi
    
    # Arrêter nos processus spécifiques
    if [ ! -z "$BACKEND_PID" ] && kill -0 $BACKEND_PID 2>/dev/null; then
        kill -9 $BACKEND_PID >/dev/null 2>&1
        wait $BACKEND_PID 2>/dev/null
    fi
    
    if [ ! -z "$FRONTEND_PID" ] && kill -0 $FRONTEND_PID 2>/dev/null; then
        kill -9 $FRONTEND_PID >/dev/null 2>&1
        wait $FRONTEND_PID 2>/dev/null
    fi
    
    if [ ! -z "$BOT_PID" ] && kill -0 $BOT_PID 2>/dev/null; then
        kill -9 $BOT_PID >/dev/null 2>&1
        wait $BOT_PID 2>/dev/null
    fi
    
    # Tuer les processus Node.js liés au projet avec force (silencieux)
    pkill -9 -f "node.*server.js" >/dev/null 2>&1
    pkill -9 -f "react-scripts start" >/dev/null 2>&1
    pkill -9 -f "node.*bot.js" >/dev/null 2>&1
    pkill -9 -f "nodemon" >/dev/null 2>&1
    
    # Tuer les processus sur les ports spécifiques (silencieux)
    lsof -ti:3000 | xargs -r kill -9 >/dev/null 2>&1
    lsof -ti:3001 | xargs -r kill -9 >/dev/null 2>&1
    lsof -ti:8080 | xargs -r kill -9 >/dev/null 2>&1
    
    # Attendre moins longtemps car kill -9 est instantané
    sleep 1
    
    log "${GREEN}✅ Tous les services ont été arrêtés${NC}"
    exit 0
}

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

# Fonction de nettoyage des anciens processus (version normale)
cleanup_old_processes() {
    log "${PURPLE}🧹 Nettoyage des anciens processus...${NC}"
    
    # Kill -9 pour forcer l'arrêt immédiat
    pkill -9 -f "node.*server.js" >/dev/null 2>&1
    pkill -9 -f "react-scripts start" >/dev/null 2>&1
    pkill -9 -f "node.*bot.js" >/dev/null 2>&1
    pkill -9 -f "nodemon" >/dev/null 2>&1
    
    # Tuer les processus sur les ports spécifiques
    lsof -ti:3000 | xargs -r kill -9 >/dev/null 2>&1
    lsof -ti:3001 | xargs -r kill -9 >/dev/null 2>&1
    lsof -ti:8080 | xargs -r kill -9 >/dev/null 2>&1

    # Attendre que les ports se libèrent
    wait_for_port_free 3001
    wait_for_port_free 3000
    wait_for_port_free 8080

    log "${GREEN}✅ Nettoyage terminé${NC}"
}

# Fonction de nettoyage des anciens processus (version forcée pour restart)
cleanup_old_processes_force() {
    log "${PURPLE}🧹 Nettoyage forcé des anciens processus...${NC}"
    
    # Kill -9 pour forcer l'arrêt immédiat (silencieux)
    pkill -9 -f "node.*server.js" >/dev/null 2>&1
    pkill -9 -f "react-scripts start" >/dev/null 2>&1
    pkill -9 -f "node.*bot.js" >/dev/null 2>&1
    pkill -9 -f "nodemon" >/dev/null 2>&1
    
    # Aussi tuer les processus sur les ports spécifiques (silencieux)
    lsof -ti:3000 | xargs -r kill -9 >/dev/null 2>&1
    lsof -ti:3001 | xargs -r kill -9 >/dev/null 2>&1
    lsof -ti:8080 | xargs -r kill -9 >/dev/null 2>&1

    # Attendre moins longtemps car kill -9 est instantané
    sleep 1

    log "${GREEN}✅ Nettoyage forcé terminé${NC}"
}

# Fonction de vérification des répertoires
check_directories() {
    if [ ! -d "$BACKEND_DIR" ]; then
        log "${RED}❌ Répertoire backend introuvable: $BACKEND_DIR${NC}"
        return 1
    fi

    if [ ! -d "$FRONTEND_DIR" ]; then
        log "${RED}❌ Répertoire frontend introuvable: $FRONTEND_DIR${NC}"
        return 1
    fi

    if [ ! -d "$DISCORD_BOT_DIR" ]; then
        log "${RED}❌ Répertoire discord-bot introuvable: $DISCORD_BOT_DIR${NC}"
        return 1
    fi

    # Vérifier les fichiers package.json
    if [ ! -f "$BACKEND_DIR/package.json" ]; then
        log "${RED}❌ package.json manquant dans le backend${NC}"
        return 1
    fi

    if [ ! -f "$FRONTEND_DIR/package.json" ]; then
        log "${RED}❌ package.json manquant dans le frontend${NC}"
        return 1
    fi

    if [ ! -f "$DISCORD_BOT_DIR/package.json" ]; then
        log "${RED}❌ package.json manquant dans discord-bot${NC}"
        return 1
    fi

    return 0
}

# Fonction pour démarrer le backend
start_backend() {
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
        cd "$PROJECT_DIR"
        return 0
    else
        log "${RED}❌ Erreur lors du démarrage du backend${NC}"
        log "${RED}📋 Vérifiez les logs: tail -f logs/backend.log${NC}"
        cd "$PROJECT_DIR"
        return 1
    fi
}

# Fonction pour démarrer le frontend
start_frontend() {
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
        cd "$PROJECT_DIR"
        return 0
    else
        log "${RED}❌ Erreur lors du démarrage du frontend${NC}"
        log "${RED}📋 Vérifiez les logs: tail -f logs/frontend.log${NC}"
        cd "$PROJECT_DIR"
        return 1
    fi
}

# Fonction pour démarrer le bot Discord
start_discord_bot() {
    log "${YELLOW}🤖 Démarrage du Bot Discord...${NC}"
    cd "$DISCORD_BOT_DIR"

    nohup npm start > "$PROJECT_DIR/logs/discord-bot.log" 2>&1 &
    BOT_PID=$!
    log "${YELLOW}🤖 Bot Discord démarré avec npm start - Version complète (PID: $BOT_PID)${NC}"

    # Attendre que le bot démarre
    sleep 3

    # Vérifier si le bot est démarré
    if kill -0 $BOT_PID 2>/dev/null; then
        log "${GREEN}✅ Bot Discord démarré avec succès${NC}"
        cd "$PROJECT_DIR"
        return 0
    else
        log "${YELLOW}⚠️  Le bot Discord pourrait avoir des problèmes${NC}"
        log "${YELLOW}📋 Vérifiez les logs: tail -f logs/discord-bot.log${NC}"
        cd "$PROJECT_DIR"
        return 1
    fi
}

# Fonction pour afficher les informations finales
display_final_info() {
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

    echo -e "\n${GREEN}🎉 La plateforme est prête ! Rendez-vous sur http://localhost:3000${NC}"
    echo -e "${PURPLE}🔐 Panel Admin accessible sur http://localhost:3001/api/admin${NC}"

    echo -e "\n${RED}🎮 COMMANDES INTERACTIVES:${NC}"
    echo -e "${YELLOW}Tapez 'r' + Entrée → Redémarrage rapide${NC}"
    echo -e "${RED}Tapez 'q' + Entrée → Arrêter tout${NC}"
    echo -e "${RED}Ou appuyez sur Ctrl+C → Arrêter tout${NC}"
    echo -e "${CYAN}⏳ En attente de commandes...${NC}\n"
}

# Fonction de redémarrage rapide
restart_platform() {
    echo -e "\n${YELLOW}🔄 REDÉMARRAGE RAPIDE DE LA PLATEFORME...${NC}"
    
    # Désactiver les notifications de jobs pour éviter les messages "Processus arrêté"
    set +m
    
    # Arrêter le monitoring silencieusement
    if [ ! -z "$MONITOR_PID" ] && kill -0 $MONITOR_PID 2>/dev/null; then
        kill -9 $MONITOR_PID >/dev/null 2>&1
        wait $MONITOR_PID 2>/dev/null
    fi
    
    # Arrêter tous les services existants silencieusement
    if [ ! -z "$BACKEND_PID" ] && kill -0 $BACKEND_PID 2>/dev/null; then
        kill -9 $BACKEND_PID >/dev/null 2>&1
        wait $BACKEND_PID 2>/dev/null
        log "${BLUE}📊 Backend arrêté${NC}"
    fi
    
    if [ ! -z "$FRONTEND_PID" ] && kill -0 $FRONTEND_PID 2>/dev/null; then
        kill -9 $FRONTEND_PID >/dev/null 2>&1
        wait $FRONTEND_PID 2>/dev/null
        log "${GREEN}🌐 Frontend arrêté${NC}"
    fi
    
    if [ ! -z "$BOT_PID" ] && kill -0 $BOT_PID 2>/dev/null; then
        kill -9 $BOT_PID >/dev/null 2>&1
        wait $BOT_PID 2>/dev/null
        log "${YELLOW}🤖 Bot Discord arrêté${NC}"
    fi
    
    # Réactiver les notifications de jobs
    set -m
    
    # Nettoyage complet des processus avec kill -9
    cleanup_old_processes_force
    
    # Redémarrer tous les services avec le même affichage que le démarrage initial
    echo -e "\n${CYAN}════════════════════════════════════════${NC}"
    echo -e "${CYAN}🔄 REDÉMARRAGE DES SERVICES${NC}"
    echo -e "${CYAN}════════════════════════════════════════${NC}\n"
    
    if start_backend; then
        start_frontend
        start_discord_bot
        
        # Affichage des informations finales
        display_final_info
        
        # Redémarrer le monitoring
        monitor_services &
        MONITOR_PID=$!
    else
        log "${RED}❌ Erreur lors du redémarrage du backend${NC}"
    fi
}

# Fonction pour écouter les commandes clavier avec timeout
listen_for_commands() {
    echo -e "${CYAN}💡 Tapez 'r' + Entrée pour redémarrer, 'q' + Entrée pour quitter${NC}"
    while true; do
        read command 2>/dev/null
        case $command in
            r|R|restart)
                restart_platform
                ;;
            q|Q|quit|exit)
                cleanup
                ;;
            "")
                # Entrée vide - continue sans afficher de message
                ;;
            *)
                echo -e "${YELLOW}⚠️  Commande inconnue. Utilisez 'r' pour redémarrer ou 'q' pour quitter${NC}"
                ;;
        esac
    done
}

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

# FONCTION PRINCIPALE
start_crypto_platform() {
    # Logo ASCII CRYPTOBU
    echo -e "${CYAN}"
    echo "  ██████╗██████╗ ██╗   ██╗██████╗ ████████╗ ██████╗ ██████╗ ██╗   ██╗"
    echo " ██╔════╝██╔══██╗╚██╗ ██╔╝██╔══██╗╚══██╔══╝██╔═══██╗██╔══██╗██║   ██║"
    echo " ██║     ██████╔╝ ╚████╔╝ ██████╔╝   ██║   ██║   ██║██████╔╝██║   ██║"
    echo " ██║     ██╔══██╗  ╚██╔╝  ██╔═══╝    ██║   ██║   ██║██╔══██╗██║   ██║"
    echo " ╚██████╗██║  ██║   ██║   ██║        ██║   ╚██████╔╝██████╔╝╚██████╔╝"
    echo "  ╚═════╝╚═╝  ╚═╝   ╚═╝   ╚═╝        ╚═╝    ╚═════╝ ╚═════╝  ╚═════╝ "
    echo -e "${NC}"
    echo -e "${PURPLE}                    🚀 Plateforme Crypto Trading 🚀${NC}"
    echo -e "${YELLOW}                         Démarrage en cours...${NC}\n"
    
    # Intercepter Ctrl+C
    trap cleanup SIGINT SIGTERM
    
    # Nettoyage des anciens processus
    cleanup_old_processes
    
    # Vérifier que les répertoires existent
    if ! check_directories; then
        exit 1
    fi
    
    # Créer les répertoires de logs s'ils n'existent pas
    mkdir -p "$PROJECT_DIR/logs"
    
    echo -e "\n${CYAN}════════════════════════════════════════${NC}"
    echo -e "${CYAN}🚀 DÉMARRAGE DES SERVICES${NC}"
    echo -e "${CYAN}════════════════════════════════════════${NC}\n"
    
    # Démarrer les services
    if ! start_backend; then
        exit 1
    fi
    
    start_frontend
    start_discord_bot
    
    # Affichage des informations finales
    display_final_info
    
    # Démarrer le monitoring en arrière-plan
    monitor_services &
    MONITOR_PID=$!
    
    # Démarrer l'écoute des commandes (en premier plan maintenant)
    listen_for_commands
}

# Appel de la fonction principale
start_crypto_platform