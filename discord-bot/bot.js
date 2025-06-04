const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
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

// Données en cache
let priceCache = new Map();
let lastUpdate = new Date();

// Configuration des cryptos suivies (étendue)
const TRACKED_CRYPTOS = {
  bitcoin: { name: 'Bitcoin', symbol: 'BTC', emoji: '₿', color: '#F7931A' },
  ethereum: { name: 'Ethereum', symbol: 'ETH', emoji: 'Ξ', color: '#627EEA' },
  cardano: { name: 'Cardano', symbol: 'ADA', emoji: '₳', color: '#0033AD' },
  polkadot: { name: 'Polkadot', symbol: 'DOT', emoji: '●', color: '#E6007A' },
  chainlink: { name: 'Chainlink', symbol: 'LINK', emoji: '⛓', color: '#375BD2' },
  litecoin: { name: 'Litecoin', symbol: 'LTC', emoji: 'Ł', color: '#BFBBBB' },
  'bitcoin-cash': { name: 'Bitcoin Cash', symbol: 'BCH', emoji: '₿', color: '#8DC351' },
  stellar: { name: 'Stellar', symbol: 'XLM', emoji: '✦', color: '#14B6E7' },
  dogecoin: { name: 'Dogecoin', symbol: 'DOGE', emoji: 'Ð', color: '#C2A633' },
  polygon: { name: 'Polygon', symbol: 'MATIC', emoji: '⬡', color: '#8247E5' },
  solana: { name: 'Solana', symbol: 'SOL', emoji: '◎', color: '#00D18C' },
  avalanche: { name: 'Avalanche', symbol: 'AVAX', emoji: '🔺', color: '#E84142' }
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
      },
      timeout: 10000
    });
    
    Object.keys(response.data).forEach(coin => {
      priceCache.set(coin, response.data[coin]);
    });
    
    lastUpdate = new Date();
    console.log(`✅ Prix mis à jour: ${new Date().toLocaleTimeString()}`);
    
    return response.data;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des prix:', error.message);
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
        interval: days <= 1 ? 'hourly' : days <= 7 ? 'hourly' : 'daily'
      },
      timeout: 15000
    });
    
    return response.data;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des données historiques:', error.message);
    return null;
  }
}

// Fonction pour créer un graphique amélioré
async function createPriceChart(cryptoId, days = 7) {
  const data = await fetchHistoricalData(cryptoId, days);
  if (!data || !data.prices || data.prices.length === 0) {
    return null;
  }

  const width = 1000;
  const height = 600;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Préparation des données
  const prices = data.prices.map(p => ({ x: new Date(p[0]), y: p[1] }));
  const cryptoInfo = TRACKED_CRYPTOS[cryptoId];
  
  // Calcul des statistiques
  const currentPrice = prices[prices.length - 1]?.y || 0;
  const startPrice = prices[0]?.y || 0;
  const change = ((currentPrice - startPrice) / startPrice) * 100;
  const isPositive = change >= 0;

  // Configuration du graphique
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [{
        label: `${cryptoInfo?.name || cryptoId} (USD)`,
        data: prices,
        borderColor: cryptoInfo?.color || '#00D4AA',
        backgroundColor: `${cryptoInfo?.color || '#00D4AA'}20`,
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointBackgroundColor: cryptoInfo?.color || '#00D4AA',
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2,
      }]
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: `${cryptoInfo?.emoji || ''} ${cryptoInfo?.name || cryptoId} - ${days} jour${days > 1 ? 's' : ''}`,
          color: '#FFFFFF',
          font: {
            size: 20,
            weight: 'bold'
          },
          padding: 20
        },
        legend: {
          display: false
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#FFFFFF',
          bodyColor: '#FFFFFF',
          borderColor: cryptoInfo?.color || '#00D4AA',
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              return `Prix: $${context.parsed.y.toFixed(2)}`;
            }
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
          ticks: { 
            color: '#FFFFFF',
            maxTicksLimit: 8
          },
          grid: { 
            color: 'rgba(255, 255, 255, 0.1)',
            drawBorder: false
          }
        },
        y: {
          ticks: { 
            color: '#FFFFFF',
            callback: function(value) {
              return '$' + value.toLocaleString();
            }
          },
          grid: { 
            color: 'rgba(255, 255, 255, 0.1)',
            drawBorder: false
          }
        }
      },
      elements: {
        point: {
          hoverBackgroundColor: '#FFFFFF'
        }
      }
    }
  });

  // Ajouter des informations supplémentaires sur le graphique
  ctx.fillStyle = isPositive ? '#00FF88' : '#FF4444';
  ctx.font = 'bold 16px Arial';
  ctx.fillText(`${isPositive ? '+' : ''}${change.toFixed(2)}%`, width - 120, 50);
  
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '14px Arial';
  ctx.fillText(`Prix actuel: $${currentPrice.toLocaleString()}`, width - 200, 75);

  return canvas.toBuffer('image/png');
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
    .setName('compare')
    .setDescription('Comparer deux cryptomonnaies')
    .addStringOption(option =>
      option.setName('crypto1')
        .setDescription('Première cryptomonnaie')
        .setRequired(true)
        .addChoices(
          ...Object.entries(TRACKED_CRYPTOS).map(([id, info]) => ({
            name: `${info.emoji} ${info.name}`,
            value: id
          }))
        )
    )
    .addStringOption(option =>
      option.setName('crypto2')
        .setDescription('Deuxième cryptomonnaie')
        .setRequired(true)
        .addChoices(
          ...Object.entries(TRACKED_CRYPTOS).map(([id, info]) => ({
            name: `${info.emoji} ${info.name}`,
            value: id
          }))
        )
    ),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Afficher l\'aide du bot crypto')
];

// Fonctions utilitaires pour le formatage
function formatPrice(price) {
  if (!price) return '$0.00';
  if (price < 0.01) return `$${price.toFixed(6)}`;
  if (price < 1) return `$${price.toFixed(4)}`;
  return `$${price.toLocaleString()}`;
}

function formatChange(change) {
  if (!change) return '+0.00%';
  const formatted = change.toFixed(2);
  return change >= 0 ? `+${formatted}%` : `${formatted}%`;
}

function formatMarketCap(marketCap) {
  if (!marketCap) return 'N/A';
  if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(1)}T`;
  if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(1)}B`;
  if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(1)}M`;
  return `$${marketCap.toLocaleString()}`;
}

// Event: Bot prêt
client.once('ready', async () => {
  console.log(`🚀 Bot connecté en tant que ${client.user.tag}!`);
  
  // Enregistrer les commandes slash
  try {
    await client.application.commands.set(commands);
    console.log('✅ Commandes slash enregistrées avec succès!');
  } catch (error) {
    console.error('❌ Erreur lors de l\'enregistrement des commandes:', error);
  }
  
  // Récupérer les prix au démarrage
  await fetchCryptoPrices();
  
  // Mettre à jour les prix toutes les 2 minutes
  setInterval(fetchCryptoPrices, 120000);
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
      case 'compare':
        await handleCompareCommand(interaction);
        break;
      case 'help':
        await handleHelpCommand(interaction);
        break;
      default:
        await interaction.reply('❌ Commande non reconnue!');
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution de la commande:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ Une erreur est survenue lors de l\'exécution de la commande.',
        ephemeral: true
      });
    }
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
    .setFooter({ text: 'Données fournies par CoinGecko • Utilisez /chart pour voir le graphique' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

// Handler pour la commande portfolio
async function handlePortfolioCommand(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('📊 Portfolio Crypto - Prix en Temps Réel')
    .setColor(0x00D4AA)
    .setFooter({ text: 'Données fournies par CoinGecko • Utilisez /chart <crypto> pour voir les graphiques' })
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

// Handler pour la commande chart (amélioré)
async function handleChartCommand(interaction) {
  await interaction.deferReply();

  const coinId = interaction.options.getString('coin');
  const days = interaction.options.getInteger('days') || 7;
  const cryptoInfo = TRACKED_CRYPTOS[coinId];

  try {
    console.log(`📈 Génération du graphique pour ${cryptoInfo.name} (${days} jours)...`);
    
    const chartBuffer = await createPriceChart(coinId, days);
    
    if (!chartBuffer) {
      await interaction.editReply('❌ Impossible de générer le graphique. Vérifiez que les données sont disponibles.');
      return;
    }

    const priceData = priceCache.get(coinId);
    const currentPrice = priceData ? formatPrice(priceData.usd) : 'N/A';
    const change24h = priceData ? formatChange(priceData.usd_24h_change) : 'N/A';
    const isPositive = priceData ? (priceData.usd_24h_change || 0) >= 0 : true;

    const embed = new EmbedBuilder()
      .setTitle(`📈 Graphique ${cryptoInfo.name} (${days} jour${days > 1 ? 's' : ''})`)
      .setColor(isPositive ? 0x00ff00 : 0xff0000)
      .addFields(
        { name: '💰 Prix Actuel', value: currentPrice, inline: true },
        { name: '📊 Variation 24h', value: change24h, inline: true },
        { name: '📅 Période', value: `${days} jour${days > 1 ? 's' : ''}`, inline: true }
      )
      .setImage('attachment://chart.png')
      .setFooter({ text: 'Données fournies par CoinGecko' })
      .setTimestamp();

    const attachment = new AttachmentBuilder(chartBuffer, { name: 'chart.png' });

    await interaction.editReply({
      embeds: [embed],
      files: [attachment]
    });

    console.log(`✅ Graphique généré avec succès pour ${cryptoInfo.name}`);
  } catch (error) {
    console.error('❌ Erreur lors de la création du graphique:', error);
    await interaction.editReply('❌ Erreur lors de la génération du graphique. Réessayez dans quelques instants.');
  }
}

// Handler pour la commande compare
async function handleCompareCommand(interaction) {
  await interaction.deferReply();

  const crypto1Id = interaction.options.getString('crypto1');
  const crypto2Id = interaction.options.getString('crypto2');
  
  if (crypto1Id === crypto2Id) {
    await interaction.editReply('❌ Veuillez sélectionner deux cryptomonnaies différentes.');
    return;
  }

  const crypto1Info = TRACKED_CRYPTOS[crypto1Id];
  const crypto2Info = TRACKED_CRYPTOS[crypto2Id];
  const price1Data = priceCache.get(crypto1Id);
  const price2Data = priceCache.get(crypto2Id);

  if (!price1Data || !price2Data) {
    await interaction.editReply('❌ Données non disponibles pour une ou plusieurs cryptomonnaies.');
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('⚖️ Comparaison Cryptomonnaies')
    .setColor(0x00D4AA)
    .addFields(
      { 
        name: `${crypto1Info.emoji} ${crypto1Info.name} (${crypto1Info.symbol})`, 
        value: `💰 ${formatPrice(price1Data.usd)}\n📊 ${formatChange(price1Data.usd_24h_change)}\n🏦 MC: ${formatMarketCap(price1Data.usd_market_cap)}`, 
        inline: true 
      },
      { name: '\u200B', value: '\u200B', inline: true },
      { 
        name: `${crypto2Info.emoji} ${crypto2Info.name} (${crypto2Info.symbol})`, 
        value: `💰 ${formatPrice(price2Data.usd)}\n📊 ${formatChange(price2Data.usd_24h_change)}\n🏦 MC: ${formatMarketCap(price2Data.usd_market_cap)}`, 
        inline: true 
      }
    )
    .setFooter({ text: 'Données fournies par CoinGecko' })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

// Handler pour l'aide
async function handleHelpCommand(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('🤖 Aide - Bot Crypto Trading Avancé')
    .setColor(0x00D4AA)
    .setDescription('Voici toutes les commandes disponibles:')
    .addFields(
      {
        name: '📊 `/crypto <coin>`',
        value: 'Affiche le prix détaillé d\'une cryptomonnaie avec toutes les informations importantes',
        inline: false
      },
      {
        name: '📈 `/portfolio`',
        value: 'Affiche un résumé de toutes les cryptos suivies avec leurs prix actuels',
        inline: false
      },
      {
        name: '📉 `/chart <coin> [days]`',
        value: 'Génère un graphique de prix professionnel (1, 7, 30, ou 90 jours)',
        inline: false
      },
      {
        name: '⚖️ `/compare <crypto1> <crypto2>`',
        value: 'Compare deux cryptomonnaies côte à côte',
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
      ).join(' • '),
      inline: false
    })
    .setFooter({ 
      text: '🌐 Bot développé avec Discord.js • Données CoinGecko',
      iconURL: client.user.displayAvatarURL()
    })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

// Command rapide pour les messages texte
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
          `💰 ${formatPrice(priceData.usd)} | ${changeEmoji} ${formatChange(change24h)}\n` +
          `💡 *Utilisez \`/chart ${cryptoId}\` pour voir le graphique*`
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
  console.error('❌ Erreur Discord:', error);
});

process.on('unhandledRejection', error => {
  console.error('❌ Unhandled promise rejection:', error);
});

// Connexion du bot
client.login(process.env.DISCORD_BOT_TOKEN);