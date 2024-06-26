const { Client, Events, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonStyle, ButtonBuilder } = require('discord.js');
const { discordToken, channelId, channelLogsId, host, dataPrivacyPolicy, protocol, verifiedRoleId } = require('../../config.json');
const event = require('../events/index').eventBus;
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on('interactionCreate', async interaction => {
    console.log(interaction);
    if(interaction.isButton()) {
        console.log(interaction)
        let verificationObject = {
            guildId: interaction.guildId,
            userId: interaction.user.id,
            timestamp: Date.now()
        }

        let base64 = Buffer.from(JSON.stringify(verificationObject)).toString('base64');
        interaction.reply({ content: `Bitte öffne folgenden Link: <${protocol}://${host}?data=${base64}>`, ephemeral: true });
    }
})

client.once(Events.ClientReady, readyClient => {
	let targetChannel = readyClient.channels.cache.find(channel => channel.id === channelId);
    targetChannel.messages.fetch().then(messages => {
        messages.forEach(message => {
            if (message.author.id === readyClient.user.id) {
                message.delete();
            }
        });
    }).then(() => {
        if (targetChannel) {
            let confirm = new ButtonBuilder()
                .setCustomId('verify')
                .setLabel('Verifizieren')
                .setStyle(ButtonStyle.Success);
    
            let actionRow = new ActionRowBuilder()
                .addComponents(confirm)
    
            let embedBuilder = new EmbedBuilder()
                .setTitle('Verifizierung erforderlich')
                .setDescription('Um diesen Server nutzen zu können, musst du dich verifizieren. Dies kannst du tun, indem du auf den Button klickst. Wurdest du in der Vergangenheit bereits einmal verifiziert, musst du dich durch einen Administrator manuell freischalten lassen.')
                .setColor('#FF0000');
    
            if(dataPrivacyPolicy && dataPrivacyPolicy.length > 0) {
                targetChannel.send("Mit der Verifizierung stimmst der Datenschutzerklärung und der Verarbeitung deiner personenbezogenen Daten zu. Die Verifizierung schützt andere Mitglieder vor Spam und Missbrauch. Jedes Konto kann pro Person nur einmal verifiziert werden. Das Team behält sich das Recht vor, die Verifizierung jederzeit zu widerrufen.")
                targetChannel.send(dataPrivacyPolicy)
            }
            targetChannel.send({ embeds: [embedBuilder], components: [actionRow] });
        }
    });
});

client.on('ready', () => {
    console.log('Discord is connected and cached');
    event.emit('discord:ready');
});

event.on('verification:success', (authenticationObject, internetProtocolAddress) => {
    client.guilds.fetch().then(async () => {
        const guild = await client.guilds.fetch(authenticationObject.guildId);
        const member = await guild.members.fetch(authenticationObject.userId);
        const role = guild.roles.cache.get(verifiedRoleId);
    
        if (role && member) {
            member.roles.add(role)
                .then(() => {
                    console.log(`Role ${role.name} has been added to ${member.user.tag}`)
                    let embedBuilder = new EmbedBuilder();
                    embedBuilder.setTitle('Verifizierung abgeschlossen');
                    embedBuilder.setFields([
                        { name: 'Benutzername', value: `<@${member.id}>`, inline: false },
                        { name: 'Zeitpunkt', value: `${new Date().toISOString()}`, inline: false },
                        { name: 'IP-Adresse', value: internetProtocolAddress, inline: false },
                        { name: 'IP-Informationen', value: `[Informationen anzeigen](https://ipinfo.io/${internetProtocolAddress})`, inline: false },
                        { name: 'User-ID', value: `${member.id}`, inline: false },
                    ]);
                    client.channels.cache.get(channelLogsId).send({embeds: [embedBuilder]});
                })
                .catch(console.error);
        } else {
            console.log('Role or member not found');
        }
    });
});

client.login(discordToken);