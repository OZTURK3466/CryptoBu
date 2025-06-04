const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

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
  polygon: { name: 'Polygon', symbol: 'MATIC', emoji: '⬡' },
  solana: { name: 'Solana', symbol: 'SOL', emoji: '◎' },
  avalanche: { name: 'Avalanche', symbol: 'AVAX', emoji: '🔺' }
};

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
    .setDescription('Afficher toutes les cryptomonnaies suivies'),

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

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

async function deployCommands() {
  try {
    console.log('🚀 Déploiement des commandes améliorées...');
    
    const data = await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands.map(command => command.toJSON()) },
    );

    console.log(`✅ ${data.length} commandes déployées avec succès!`);
    console.log('📋 Commandes disponibles:');
    data.forEach(cmd => {
      console.log(`   - /${cmd.name}: ${cmd.description}`);
    });
  } catch (error) {
    console.error('❌ Erreur lors du déploiement:', error);
  }
}

deployCommands();