module.exports = function (SQ, discord_bot_token) {
    const Discord = require('discord.js');
    const request = require('request');
    const fs = require('fs');

    const client = new Discord.Client();
    client.commands = new Discord.Collection();

    const commandFiles = fs.readdirSync(`${__dirname}/commands`);
    for (const file of commandFiles) {
        const command = require(`./commands/${file}`);
        client.commands.set(command.name, command);
    }

    const cooldowns = new Discord.Collection();

    let commandsPerInterval = 0;
    let requestsPerInterval = 0;
    function writeStatus() {
        console.log(`Connected to ${client.guilds.cache.size} guild(s). Executed ${commandsPerInterval} command(s) and sent ${requestsPerInterval} request(s) last minute. Up for ${Math.round(client.uptime / 60000)} minute(s).`);
        commandsPerInterval = 0;
        requestsPerInterval = 0;
    }

    client.on('ready', () => {
        console.log('Discord.js ready.\n');
        writeStatus();
        setInterval(writeStatus, 60000);
        client.guilds.cache.forEach(guild => guild.members.fetch().catch(console.error));
    });

    client.on('guildCreate', guild => {
        guild.members.fetch().catch(console.error);
    });

    client.on('message', message => {
        const prefixMention = new RegExp(`^<@!?${client.user.id}> `);
        const prefix = message.content.match(prefixMention) ? message.content.match(prefixMention)[0] : null;
        if (!message.content.startsWith(prefix) || message.author.bot) return; // stop running if not a command / sent by a bot

        commandsPerInterval++; // include command exection in statistics

        let args = message.content.slice(prefix.length).split(/ +/);
        if (args[0] == '') { args.shift() }
        const commandName = args.shift().toLowerCase();
        let command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
        if (typeof command === 'undefined') { // use help command as a fallback
            command = client.commands.get('help')
            args = ''
        }

        if (command.argsRequired && !args.length) { // check if command can be executed properly
            let reply = `you didn't provide any arguments.`;
            if (command.usage) {
                reply += `\nThe command's syntax is: \`${prefix}${command.name} ${command.usage}\``;
            }
            return message.reply(reply);
        }
        if (command.guildOnly && message.channel.type !== 'text') {
            return message.reply('I can\'t execute that command inside DMs!');
        }
        if (!cooldowns.has(command.name)) {
            cooldowns.set(command.name, new Discord.Collection());
        }
        const now = Date.now();
        const timestamps = cooldowns.get(command.name);
        const cooldownAmount = (command.cooldown || 5) * 1000;

        if (!timestamps.has(message.author.id)) {
            timestamps.set(message.author.id, now);
            setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
        } else {
            const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                return message.reply(`please wait ${timeLeft.toFixed(1)} more second${timeLeft !== 1 ? 's' : ''} before using the \`${command.name}\` command.`);
            }

            timestamps.set(message.author.id, now);
            setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
        }

        if (!command.adminOnly || message.member.hasPermission("ADMINISTRATOR")) {
            try { // attempt to execute the command
                command.execute(message, args, SQ, Discord.MessageEmbed);
            } catch (err) {
                console.error(err);
                message.reply('there was an error trying to execute that command!');
            }
        } else {
            message.reply('only administrators can run that command.');
        }
    });

    client.on('guildMemberUpdate', (oldMember, member) => {
        addedRole = member._roles.filter(function (val) {
            return oldMember._roles.indexOf(val) < 0;
        })[0];
        revokedRole = oldMember._roles.filter(function (val) {
            return member._roles.indexOf(val) < 0;
        })[0];
        if (!addedRole && !revokedRole) { return; }

        let callback = (err) => {
            if (err) { return console.error('Request failed', err); }
        }

        SQ.Guild.findOne({ where: { guild_id: member.guild.id, url: { [SQ.Op.not]: null } } }).then(guild => {
            if (guild == null) { return; }
            requestsPerInterval++;
            let role = member.guild.roles.cache.get(addedRole || revokedRole)
            let apiurl = guild.url + "api/discord/users/" + member.user.id + "/roles/" + role.id
            if (addedRole) {
                request.post({ url: apiurl, auth: { bearer: guild.sync_token } }, callback);
            } else {
                request.delete({ url: apiurl, auth: { bearer: guild.sync_token } }, callback);
            }
        });
    });

    client.on("roleCreate", (role) => {
        SQ.Guild.findOne({ where: { guild_id: role.guild.id, url: { [SQ.Op.not]: null } } }).then(guild => {
            if (guild == null) { return; }
            requestsPerInterval++;
            let apiurl = guild.url + "api/discord/roles"
            request.post({ url: apiurl, auth: { bearer: guild.sync_token }, json: { id: role.id, name: role.name, color: role.color.toString(16).padStart(6, '0') }}, (err) => {
                if (err) { return console.error('Request failed', err); }
            });
        });
    });

    client.on("roleUpdate", (oldRole, role) => {
        if (oldRole.name == '@everyone' || role.name == 'new role') { return; }
        if (oldRole.name == role.name && oldRole.color == role.color) { return; }

        SQ.Guild.findOne({ where: { guild_id: role.guild.id, url: { [SQ.Op.not]: null } } }).then(guild => {
            if (guild == null) { return; }
            requestsPerInterval++;
            let apiurl = guild.url + "api/discord/roles/" + role.id;
            request({ url: apiurl, method: 'PUT', auth: { bearer: guild.sync_token }, json: { name: role.name, color: role.color.toString(16).padStart(6, '0') }}, (err) => {
                if (err) { return console.error('Request failed', err); }
            });
        });
    });

    client.on("roleDelete", (role) => {
        SQ.Guild.findOne({ where: { guild_id: role.guild.id, url: { [SQ.Op.not]: null } } }).then(guild => {
            if (guild == null) { return; }
            requestsPerInterval++;
            let apiurl = guild.url + "api/discord/roles/" + role.id;
            request.delete({ url: apiurl, auth: { bearer: guild.sync_token } }, (err) => {
                if (err) { return console.error('Request failed', err); }
            });
        });
    });

    client.login(discord_bot_token).then(() => client.user.setPresence({ game: { name: '@Ember help', type: 2 }, status: 'online' }));

    return client;
}
