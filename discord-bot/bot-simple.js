const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// Données en cache
let priceCache = new Map();

// Configuration des cryptos
const TRACKED_CRYPTOS = {
  bitcoin: { name: 'Bitcoin', symbol: 'BTC', emoji: '₿' },
  ethereum: { name: 'Ethereum', symbol: 'ETH', emoji: 'Ξ' },
  cardano: { name: 'Cardano', symbol: 'ADA', emoji: '₳' },
  polkadot: { name: 'Polkadot', symbol: 'DOT', emoji: '●' },
  chainlink: { name: 'Chainlink', symbol: 'LINK', emoji: '⛓' }
};

// Récupération des prix
async function fetchCryptoPrices() {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: {
        ids: Object.keys(TRACKED_CRYPTOS).join(','),
        vs_currencies: 'usd,eur',
        include_24hr_change: true,
        include_market_cap: true
      }
    });
    
    Object.keys(response.data).forEach(coin => {
      priceCache.set(coin, response.data[coin]);
    });
    
    console.log('Prix mis à jour:', new Date().toLocaleTimeString());
    return response.data;
  } catch (error) {
    console.error('Erreur API:', error.message);
    return null;
  }
}

// Formatage
function formatPrice(price) {
  if (!price) return '$0.00';
  if (price < 0.01) return `$${price.toFixed(6)}`;
  if (price < 1) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(2)}`;
}

function formatChange(change) {
  if (!change) return '+0.00%';
  const formatted = change.toFixed(2);
  return change >= 0 ? `+${formatted}%` : `${formatted}%`;
}

// Event: Bot prêt
client.once('ready', async () => {
  console.log(`🤖 Bot connecté : ${client.user.tag}!`);
  
  await fetchCryptoPrices();
  setInterval(fetchCryptoPrices, 120000); // 2 minutes
});

// Event: Interactions
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  try {
    if (commandName === 'crypto') {
      const coinId = interaction.options.getString('coin');
      const cryptoInfo = TRACKED_CRYPTOS[coinId];
      const priceData = priceCache.get(coinId);

      if (!priceData) {
        await interaction.reply('❌ Données non disponibles pour cette crypto.');
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
          { name: `${changeEmoji} Variation 24h`, value: formatChange(change24h), inline: true }
        )
        .setFooter({ text: 'Données fournies par CoinGecko' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
    
    else if (commandName === 'portfolio') {
      let description = '';
      for (const [coinId, cryptoInfo] of Object.entries(TRACKED_CRYPTOS)) {
        const priceData = priceCache.get(coinId);
        if (!priceData) continue;

        const change24h = priceData.usd_24h_change || 0;
        const changeEmoji = change24h >= 0 ? '📈' : '📉';

        description += `${cryptoInfo.emoji} **${cryptoInfo.name}** (${cryptoInfo.symbol})\n`;
        description += `💰 ${formatPrice(priceData.usd)} | ${changeEmoji} ${formatChange(change24h)}\n\n`;
      }

      const embed = new EmbedBuilder()
        .setTitle('📊 Portfolio Crypto - Prix en Temps Réel')
        .setDescription(description)
        .setColor(0x00D4AA)
        .setFooter({ text: 'Données fournies par CoinGecko' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
    
    else if (commandName === 'help') {
      const embed = new EmbedBuilder()
        .setTitle('🤖 Aide - Bot Crypto Trading')
        .setColor(0x00D4AA)
        .setDescription('Voici toutes les commandes disponibles:')
        .addFields(
          { name: '📊 `/crypto <coin>`', value: 'Affiche le prix détaillé d\'une cryptomonnaie', inline: false },
          { name: '📈 `/portfolio`', value: 'Affiche un résumé de toutes les cryptos suivies', inline: false },
          { name: '❓ `/help`', value: 'Affiche cette aide', inline: false }
        )
        .addFields({
          name: '🎯 Cryptomonnaies suivies',
          value: Object.values(TRACKED_CRYPTOS).map(info => 
            `${info.emoji} ${info.name} (${info.symbol})`
          ).join('\n'),
          inline: false
        })
        .setFooter({ text: '🌐 Connecté au site web de trading • Données CoinGecko' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
  } catch (error) {
    console.error('Erreur lors de l\'exécution de la commande:', error);
    await interaction.reply({
      content: '❌ Une erreur est survenue lors de l\'exécution de la commande.',
      ephemeral: true
    });
  }
});

// Gestion des erreurs
client.on('error', error => {
  console.error('Erreur Discord:', error);
});

client.login(process.env.DISCORD_BOT_TOKEN);
