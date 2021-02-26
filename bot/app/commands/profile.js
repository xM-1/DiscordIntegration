module.exports = {
    name: 'profile',
    aliases: ['user', 'p', 'steam', 'steamid'],
    cooldown: 20,
    description: 'Query for a member\'s Steam profile',
    usage: '<name>',
    argsRequired: true,
    guildOnly: true,
    execute(message, args, SQ, MessageEmbed) {
        const member = message.member;
        const msgUser = message.member.user;
        let msgGuild = message.guild;
        const matchForName = args[0].toLowerCase();

        SQ.Guild.findOne({ where: { guild_id: msgGuild.id, url: { [SQ.Op.ne]: null } } }).then(guild => {
            if (guild === null) {
                message.channel.send(`Secret key or URL not set, ${member}.`);
            } else {
                let foundMember = msgGuild.members.cache.find(val => val.user.username.toLowerCase().indexOf(matchForName) !== -1);
                if (foundMember != null) {
                    let request = require('request');
                    let apiurl = guild.url + "api/discord/users/" + foundMember.user.id
                    request.get({ url: apiurl, auth: { bearer: guild.sync_token } }, function optionalCallback(err, httpResponse, body) {
                        if (err) {
                            return console.error('Request failed', err);
                        }
                        try {
                            body = JSON.parse(body)
                            if (body.status == 'success') {
                                let profile = body.user.steam;
                                if (profile != null) {
                                    var profileInfo = `**Discord tag:** ${foundMember.user.tag}\n`;
                                    profileInfo += `**SteamID:** ${profile.steamid}\n`;
                                    const embed = new MessageEmbed()
                                        .setColor(2236962)
                                        .setAuthor(foundMember.user.username, foundMember.user.displayAvatarURL({ size: 32 }), `${guild.url}profile/${profile.steamid}`)
                                        .setDescription(profileInfo)
                                        .setFooter(`Requested by ${msgUser.tag}`, msgUser.displayAvatarURL({ size: 32 }));
                                    return message.channel.send(embed);
                                }
                            } else {
                                message.reply('profile not found.')
                            }
                        } catch (e) {
                            message.reply('failed to parse response.')
                        }
                    });
                } else {
                    message.reply('user not found.')
                }
            }
        })
    }
};
