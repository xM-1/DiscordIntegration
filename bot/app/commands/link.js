const { MessageEmbed } = require('discord.js');

module.exports = {
    name: 'link',
    aliases: ['linksteam'],
    cooldown: 30,
    description: 'Link your SteamID with your Discord ID',
    argsRequired: false,
    guildOnly: true,
    execute(message, args, SQ) {
        const member = message.member;
        let guild = message.guild;

        SQ.Guild.findOne({ where: { guild_id: guild.id, url: { [SQ.Op.ne]: null } } }).then(guild => {
            if (guild === null) {
                message.channel.send(`Secret key or URL not set, ${member}.`);
            } else {
                let request = require('request');
                request.get({ url: guild.url + "api/discord/users/" + member.user.id, auth: { bearer: guild.sync_token } }, (err, httpResponse, body) => {
                    if (err) {
                        return console.error('Request failed', err);
                    }
                    try {
                        body = JSON.parse(body)
                        if (body.status == 'success') {
                            message.reply('your account is already linked.');
                        } else {
                            const jwtlib = require('jsonwebtoken');
                            var jwt = jwtlib.sign({ discordid: member.id, username: member.user.username, avatarURL: member.user.displayAvatarURL() }, guild.sync_token);
            
                            let authurl = guild.url + "discord/link/" + jwt

                            let embed = new MessageEmbed()
                                            .setTitle('Link your accounts')
                                            .setURL(authurl)
                                            .setDescription('Link your Steam & Discord accounts on our community by clicking on the link above. You might be requested to sign in through Steam.');

                            member.send(embed)
                                .then(() => message.reply(`I've sent an authorization link to you as a direct message.`))
                                .catch(() => message.reply('please allow DMs in your privacy settings.'));
                        }
                    } catch (e) {
                        console.error(e);
                        message.reply('failed to parse response.');
                    }
                });
            }
        })
    }
};
