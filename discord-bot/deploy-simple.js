const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const TRACKED_CRYPTOS = {
  bitcoin: { name: 'Bitcoin', symbol: 'BTC', emoji: '₿' },
  ethereum: { name: 'Ethereum', symbol: 'ETH', emoji: 'Ξ' },
  cardano: { name: 'Cardano', symbol: 'ADA', emoji: '₳' },
  polkadot: { name: 'Polkadot', symbol: 'DOT', emoji: '●' },
  chainlink: { name: 'Chainlink', symbol: 'LINK', emoji: '⛓' }
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
    .setName('help')
    .setDescription('Afficher l\'aide du bot crypto')
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

async function deployCommands() {
  try {
    console.log('🚀 Déploiement des commandes simples...');
    
    const data = await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands.map(command => command.toJSON()) },
    );

    console.log(`✅ ${data.length} commandes déployées avec succès!`);
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

deployCommands();
