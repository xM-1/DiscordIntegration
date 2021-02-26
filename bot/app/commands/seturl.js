module.exports = {
    name: 'seturl',
    cooldown: 10,
    description: 'Set the URL of the Ember instance to link this Discord guild with',
    usage: 'http(s)://example.com',
    argsRequired: true,
    guildOnly: true,
    adminOnly: true,
    execute(message, args, SQ) {
        const member = message.member;
        const msgGuild = message.guild;
        
        let newUrl;
        try {
            newUrl = new URL(args[0]);
        } catch (e) {
            return message.reply('failed to parse the specified URL.');
        }

        SQ.Guild.findOne({ where: { guild_id: msgGuild.id } }).then(guild => {
            if (guild === null) { // guild doesn't exist
                message.channel.send(`Assign the sync token first, ${member}.`);
            } else { // there's an existing guild in the DB associated with the API key
                const request = require('request');
                request.get({ url: newUrl + "api/discord/connectioncheck", auth: { bearer: guild.sync_token } }, (err, httpResponse, body) => {
                    if (err) {
                        console.error(err);
                        return message.reply('error requesting the specified URL.');
                    }
                    try {
                        body = JSON.parse(body)
                        if (body.status == 'success') {
                            guild.update({
                                url: newUrl.toString() // override the guild URL
                            }).then(() => {
                                message.reply('guild URL updated.');
                            })
                        } else if (body.status == 'bot_unreachable') {
                            message.reply('two-way connection check failed. Verify that the module is configured properly.')
                        } else {
                            message.reply('the specified URL is not valid or the sync token does not match.');
                        }
                    } catch (e) {
                        console.error(e);
                        console.log(body);
                        message.reply('the specified URL sent an unexpected response.');
                    }
                });
            }
        })
    }
};
