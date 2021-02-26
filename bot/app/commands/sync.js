module.exports = {
    name: 'sync',
    aliases: ['role', 'redeem'],
    cooldown: 30,
    description: 'Sync your roles from Ember into Discord roles',
    argsRequired: false,
    guildOnly: true,
    execute(message, args, SQ) {
        const request = require('request');
        const member = message.member;
        const msgGuild = message.guild;

        SQ.Guild.findOne({ where: { guild_id: msgGuild.id, url: { [SQ.Op.ne]: null } } }).then(guild => {
            if (guild === null) {
                message.channel.send(`Secret key or URL not set, ${member}.`);
            } else {
                message.reply('synchronizing your roles.')

                const apiurl = guild.url + "api/discord/users/" + member.id + "/sync"
                request.post({ url: apiurl, auth: { bearer: guild.sync_token } }, (err, res, body) => {
                    try { body = JSON.parse(body) } catch (e) { console.error(e) }
                    if (err) { return console.error('Request failed', err); }
                    if (body.status != 'success' && body.message == 'user_not_found')
                        message.reply('seems like your account is not linked. Use "' + message.mentions.users.first().toString() + ' link" to link your accounts and synchronize your roles.')
                });
            }
        })
    }
};
