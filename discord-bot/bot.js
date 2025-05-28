const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, Collection } = require('discord.js');
const axios = require('axios');
const { createCanvas } = require('canvas');
const { Chart, registerables } = require('chart.js');
require('dotenv').config();

Chart.register(...registerables);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

// Collection pour stocker les commandes
client.commands = new Collection();

// Données en cache
let priceCache = new Map();
let lastUpdate = new Date();

// Configuration des cryptos suivies
const TRACKED_CRYPTOS = {
  bitcoin: { name: 'Bitcoin', symbol: 'BTC', emoji: '₿' },
  ethereum: { name: 'Ethereum', symbol: 'ETH', emoji: 'Ξ' },
  cardano: { name: 'Cardano', symbol: 'ADA', emoji: '₳' },
  polkadot: { name: 'Polkadot', symbol: 'DOT', emoji: '●' },
  chainlink: { name: 'Chainlink', symbol: 'LINK', emoji: '⛓' },
  litecoin: { name: 'Litecoin', symbol: 'LTC', emoji: 'Ł' },
  'bitcoin-cash': { name: 'Bitcoin Cash', symbol: 'BCH', emoji: '₿' },
  stellar: { name: 'Stellar', symbol: 'XLM', emoji: '✦' },
  dogecoin: { name: 'Dogecoin', symbol: 'DOGE', emoji: 'Ð' },
  polygon: { name: 'Polygon', symbol: 'MATIC', emoji: '⬡' }
};

// Fonction pour récupérer les prix crypto depuis CoinGecko
async function fetchCryptoPrices() {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: {
        ids: Object.keys(TRACKED_CRYPTOS).join(','),
        vs_currencies: 'usd,eur',
        include_24hr_change: true,
        include_last_updated_at: true,
        include_market_cap: true,
        include_24hr_vol: true
      }
    });
    
    Object.keys(response.data).forEach(coin => {
      priceCache.set(coin, response.data[coin]);
    });
    
    lastUpdate = new Date();
    console.log('Prix mis à jour:', new Date().toLocaleTimeString());
    
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des prix:', error.message);
    return null;
  }
}

// Fonction pour récupérer les données historiques
async function fetchHistoricalData(cryptoId, days = 7) {
  try {
    const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${cryptoId}/market_chart`, {
      params: {
        vs_currency: 'usd',
        days: days,
        interval: days <= 1 ? 'hourly' : 'daily'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des données historiques:', error.message);
    return null;
  }
}

// Fonction pour créer un graphique
async function createPriceChart(cryptoId, days = 7) {
  const data = await fetchHistoricalData(cryptoId, days);
  if (!data || !data.prices) return null;

  const width = 800;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const prices = data.prices.map(p => p[1]);
  const labels = data.prices.map(p => new Date(p[0]));

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: `${TRACKED_CRYPTOS[cryptoId]?.name || cryptoId} (USD)`,
        data: prices,
        borderColor: '#00D4AA',
        backgroundColor: 'rgba(0, 212, 170, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
      }]
    },
    options: {
      responsive: false,
      plugins: {
        legend: {
          labels: {
            color: '#FFFFFF',
            font: { size: 14 }
          }
        }
      },
      scales: {
        x: {
          type: 'time',
          time: {
            displayFormats: {
              hour: 'HH:mm',
              day: 'dd/MM',
            }
          },
          ticks: { color: '#FFFFFF' },
          grid: { color: 'rgba(255, 255, 255, 0.1)' }
        },
        y: {
          ticks: { 
            color: '#FFFFFF',
            callback: function(value) {
              return '$' + value.toFixed(2);
            }
          },
          grid: { color: 'rgba(255, 255, 255, 0.1)' }
        }
      }
    }
  });

  return canvas.toBuffer();
}

// Commandes slash
const commands = [
  new SlashCommandBuilder()
    .setName('crypto')
    .setDescription('Afficher le prix d\'une cryptomonnaie')
    .addStringOption(option =>
      option.setName('coin')
        .setDescription('Cryptomonnaie à afficher')
        .setRequired(true)
        .addChoices(
          ...Object.entries(TRACKED_CRYPTOS).map(([id, info]) => ({
            name: `${info.emoji} ${info.name} (${info.symbol})`,
            value: id
          }))
        )
    ),

  new SlashCommandBuilder()
    .setName('portfolio')
    .setDescription('Afficher les prix de toutes les cryptomonnaies suivies'),

  new SlashCommandBuilder()
    .setName('chart')
    .setDescription('Afficher le graphique d\'une cryptomonnaie')
    .addStringOption(option =>
      option.setName('coin')
        .setDescription('Cryptomonnaie à afficher')
        .setRequired(true)
        .addChoices(
          ...Object.entries(TRACKED_CRYPTOS).map(([id, info]) => ({
            name: `${info.emoji} ${info.name} (${info.symbol})`,
            value: id
          }))
        )
    )
    .addIntegerOption(option =>
      option.setName('days')
        .setDescription('Nombre de jours (1, 7, 30, 90)')
        .addChoices(
          { name: '1 jour', value: 1 },
          { name: '7 jours', value: 7 },
          { name: '30 jours', value: 30 },
          { name: '90 jours', value: 90 }
        )
    ),

  new SlashCommandBuilder()
    .setName('alerts')
    .setDescription('Gérer les alertes de prix')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Ajouter une alerte de prix')
        .addStringOption(option =>
          option.setName('coin')
            .setDescription('Cryptomonnaie')
            .setRequired(true)
        )
        .addNumberOption(option =>
          option.setName('price')
            .setDescription('Prix cible')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('Lister vos alertes')
    ),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Afficher l\'aide du bot crypto')
];

// Fonction pour formater les prix
function formatPrice(price) {
  if (!price) return '$0.00';
  if (price < 0.01) return `$${price.toFixed(6)}`;
  if (price < 1) return `${price.toFixed(4)}`;
  return `${price.toFixed(2)}`;
}

function formatChange(change) {
  if (!change) return '+0.00%';
  const formatted = change.toFixed(2);
  return change >= 0 ? `+${formatted}%` : `${formatted}%`;
}

function formatMarketCap(marketCap) {
  if (!marketCap) return 'N/A';
  if (marketCap >= 1e12) return `${(marketCap / 1e12).toFixed(1)}T`;
  if (marketCap >= 1e9) return `${(marketCap / 1e9).toFixed(1)}B`;
  if (marketCap >= 1e6) return `${(marketCap / 1e6).toFixed(1)}M`;
  return `${marketCap.toFixed(0)}`;
}

// Event: Bot prêt
client.once('ready', async () => {
  console.log(`Bot connecté en tant que ${client.user.tag}!`);
  
  // Enregistrer les commandes slash
  try {
    await client.application.commands.set(commands);
    console.log('Commandes slash enregistrées avec succès!');
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement des commandes:', error);
  }
  
  // Récupérer les prix au démarrage
  await fetchCryptoPrices();
  
  // Mettre à jour les prix toutes les minutes
  setInterval(fetchCryptoPrices, 60000);
});

// Event: Interaction (commandes slash)
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  try {
    switch (commandName) {
      case 'crypto':
        await handleCryptoCommand(interaction);
        break;
      case 'portfolio':
        await handlePortfolioCommand(interaction);
        break;
      case 'chart':
        await handleChartCommand(interaction);
        break;
      case 'alerts':
        await handleAlertsCommand(interaction);
        break;
      case 'help':
        await handleHelpCommand(interaction);
        break;
      default:
        await interaction.reply('Commande non reconnue!');
    }
  } catch (error) {
    console.error('Erreur lors de l\'exécution de la commande:', error);
    await interaction.reply({
      content: 'Une erreur est survenue lors de l\'exécution de la commande.',
      ephemeral: true
    });
  }
});

// Handler pour la commande crypto
async function handleCryptoCommand(interaction) {
  const coinId = interaction.options.getString('coin');
  const cryptoInfo = TRACKED_CRYPTOS[coinId];
  const priceData = priceCache.get(coinId);

  if (!priceData) {
    await interaction.reply('❌ Données non disponibles pour cette cryptomonnaie.');
    return;
  }

  const change24h = priceData.usd_24h_change || 0;
  const isPositive = change24h >= 0;
  const changeEmoji = isPositive ? '📈' : '📉';
  const changeColor = isPositive ? 0x00ff00 : 0xff0000;

  const embed = new EmbedBuilder()
    .setTitle(`${cryptoInfo.emoji} ${cryptoInfo.name} (${cryptoInfo.symbol})`)
    .setColor(changeColor)
    .addFields(
      { name: '💰 Prix USD', value: formatPrice(priceData.usd), inline: true },
      { name: '💶 Prix EUR', value: `€${formatPrice(priceData.eur)}`, inline: true },
      { name: `${changeEmoji} Variation 24h`, value: formatChange(change24h), inline: true },
      { name: '📊 Market Cap', value: formatMarketCap(priceData.usd_market_cap), inline: true },
      { name: '📈 Volume 24h', value: formatMarketCap(priceData.usd_24h_vol), inline: true },
      { name: '⏰ Dernière MAJ', value: `<t:${Math.floor(lastUpdate.getTime() / 1000)}:R>`, inline: true }
    )
    .setFooter({ text: 'Données fournies par CoinGecko' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

// Handler pour la commande portfolio
async function handlePortfolioCommand(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('📊 Portfolio Crypto - Prix en Temps Réel')
    .setColor(0x00D4AA)
    .setFooter({ text: 'Données fournies par CoinGecko' })
    .setTimestamp();

  let description = '';
  let totalMarketCap = 0;

  for (const [coinId, cryptoInfo] of Object.entries(TRACKED_CRYPTOS)) {
    const priceData = priceCache.get(coinId);
    if (!priceData) continue;

    const change24h = priceData.usd_24h_change || 0;
    const changeEmoji = change24h >= 0 ? '📈' : '📉';
    const changeFormatted = formatChange(change24h);

    description += `${cryptoInfo.emoji} **${cryptoInfo.name}** (${cryptoInfo.symbol})\n`;
    description += `💰 ${formatPrice(priceData.usd)} | ${changeEmoji} ${changeFormatted}\n`;
    description += `📊 MC: ${formatMarketCap(priceData.usd_market_cap)}\n\n`;

    totalMarketCap += priceData.usd_market_cap || 0;
  }

  embed.setDescription(description);
  embed.addFields({
    name: '🌍 Market Cap Total',
    value: formatMarketCap(totalMarketCap),
    inline: false
  });

  await interaction.reply({ embeds: [embed] });
}

// Handler pour la commande chart
async function handleChartCommand(interaction) {
  await interaction.deferReply();

  const coinId = interaction.options.getString('coin');
  const days = interaction.options.getInteger('days') || 7;
  const cryptoInfo = TRACKED_CRYPTOS[coinId];

  try {
    const chartBuffer = await createPriceChart(coinId, days);
    
    if (!chartBuffer) {
      await interaction.editReply('❌ Impossible de générer le graphique.');
      return;
    }

    const priceData = priceCache.get(coinId);
    const currentPrice = priceData ? formatPrice(priceData.usd) : 'N/A';
    const change24h = priceData ? formatChange(priceData.usd_24h_change) : 'N/A';

    const embed = new EmbedBuilder()
      .setTitle(`📈 Graphique ${cryptoInfo.name} (${days} jour${days > 1 ? 's' : ''})`)
      .setColor(0x00D4AA)
      .addFields(
        { name: '💰 Prix Actuel', value: currentPrice, inline: true },
        { name: '📊 Variation 24h', value: change24h, inline: true }
      )
      .setImage('attachment://chart.png')
      .setFooter({ text: 'Données fournies par CoinGecko' })
      .setTimestamp();

    await interaction.editReply({
      embeds: [embed],
      files: [{ attachment: chartBuffer, name: 'chart.png' }]
    });
  } catch (error) {
    console.error('Erreur lors de la création du graphique:', error);
    await interaction.editReply('❌ Erreur lors de la génération du graphique.');
  }
}

// Handler pour les alertes (fonctionnalité basique)
async function handleAlertsCommand(interaction) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'add') {
    await interaction.reply({
      content: '🚧 Fonctionnalité d\'alertes en développement!\nCette fonctionnalité sera bientôt disponible.',
      ephemeral: true
    });
  } else if (subcommand === 'list') {
    await interaction.reply({
      content: '📝 Aucune alerte configurée.\nUtilisez `/alerts add` pour créer une alerte.',
      ephemeral: true
    });
  }
}

// Handler pour l'aide
async function handleHelpCommand(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('🤖 Aide - Bot Crypto Trading')
    .setColor(0x00D4AA)
    .setDescription('Voici toutes les commandes disponibles:')
    .addFields(
      {
        name: '📊 `/crypto <coin>`',
        value: 'Affiche le prix détaillé d\'une cryptomonnaie',
        inline: false
      },
      {
        name: '📈 `/portfolio`',
        value: 'Affiche un résumé de toutes les cryptos suivies',
        inline: false
      },
      {
        name: '📉 `/chart <coin> [days]`',
        value: 'Génère un graphique de prix (1, 7, 30, ou 90 jours)',
        inline: false
      },
      {
        name: '🔔 `/alerts`',
        value: 'Gère les alertes de prix (bientôt disponible)',
        inline: false
      },
      {
        name: '❓ `/help`',
        value: 'Affiche cette aide',
        inline: false
      }
    )
    .addFields({
      name: '🎯 Cryptomonnaies suivies',
      value: Object.values(TRACKED_CRYPTOS).map(info => 
        `${info.emoji} ${info.name} (${info.symbol})`
      ).join('\n'),
      inline: false
    })
    .setFooter({ 
      text: '🌐 Connecté au site web de trading • Données CoinGecko',
      iconURL: client.user.displayAvatarURL()
    })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

// Event: Messages (pour les commandes textuelles optionnelles)
client.on('messageCreate', async message => {
  if (message.author.bot) return;
  
  // Commande rapide !price <crypto>
  if (message.content.startsWith('!price ')) {
    const crypto = message.content.slice(7).toLowerCase().trim();
    const cryptoId = Object.keys(TRACKED_CRYPTOS).find(id => 
      id === crypto || 
      TRACKED_CRYPTOS[id].symbol.toLowerCase() === crypto ||
      TRACKED_CRYPTOS[id].name.toLowerCase().includes(crypto)
    );
    
    if (cryptoId) {
      const priceData = priceCache.get(cryptoId);
      const cryptoInfo = TRACKED_CRYPTOS[cryptoId];
      
      if (priceData) {
        const change24h = priceData.usd_24h_change || 0;
        const changeEmoji = change24h >= 0 ? '📈' : '📉';
        
        message.reply(
          `${cryptoInfo.emoji} **${cryptoInfo.name}** (${cryptoInfo.symbol})\n` +
          `💰 ${formatPrice(priceData.usd)} | ${changeEmoji} ${formatChange(change24h)}`
        );
      } else {
        message.reply('❌ Données non disponibles.');
      }
    } else {
      message.reply('❌ Cryptomonnaie non trouvée. Utilisez `/help` pour voir la liste.');
    }
  }
});

// Gestion des erreurs
client.on('error', error => {
  console.error('Erreur Discord:', error);
});

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

// Connexion du bot
client.login(process.env.DISCORD_BOT_TOKEN);