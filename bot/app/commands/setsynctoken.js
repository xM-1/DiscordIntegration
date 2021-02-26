module.exports = {
    name: 'setsynctoken',
    aliases: ['settoken'],
    cooldown: 15,
    description: 'Assign the sync token retireved from GmodStore to this Discord guild',
    usage: '<secret>',
    argsRequired: true,
    guildOnly: true,
    adminOnly: true,
    execute(message, args, SQ) {
        const msgGuild = message.guild;
        let syncToken = args[0];

        SQ.Customer.findOne({ where: { sync_token: syncToken } }).then(async customer => { // validate sync token
            if (customer == null) { // sync token not found in customers table
                customer = await SQ.Customer.findOne();
                if (customer !== null) { // validate key only if customers exist
                    return message.reply('invalid sync token.');
                }
            }

            SQ.Guild.findOne({ where: { sync_token: syncToken } }).then(guild => {
                if (guild === null) { // guild with sync token doesn't exist,
                    SQ.Guild.findOne({ where: { guild_id: msgGuild.id } }).then(guild => {
                        if (guild === null) { // guild with ID doesn't exist
                            SQ.Guild.create({ sync_token: syncToken, guild_id: msgGuild.id }) // create it
                                .then(guild => {
                                    message.reply('sync token set.');
                                })
                        } else { // guild with ID exists
                            guild.update({
                                sync_token: syncToken // override the guild sync token
                            }).then(() => {
                                message.reply('sync token updated.');
                            })
                        }
                    })
                } else { // there's an existing guild in the DB associated with the sync token
                    if (guild.guild_id !== msgGuild.id) { // said guild is not this one
                        guild.update({
                            guild_id: msgGuild.id // override the guild ID
                        }).then(() => {
                            message.reply('sync token assigned to a new guild.');
                        })
                    } else {
                        message.reply('that sync token is already assigned to this guild.')
                    }
                }
                message.delete();
            })
        })
    }
};
