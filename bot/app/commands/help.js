const { prefix } = require('../../config.json');

module.exports = {
	name: 'help',
	description: 'List all commands or info on a specific command',
	aliases: ['commands'],
	usage: '<command>',
	cooldown: 2,
	guildOnly: true,
	execute(message, args) {
		const msgUser = message.member.user;
		const { commands } = message.client;

		if (!args.length) {
			return message.channel.send({
				embed: {
					color: 2236962,
					title: "Command list",
					description: commands.filter(command => {
						return command.adminOnly != true || message.member.hasPermission("ADMINISTRATOR");
					}).map(command => '`' + command.name + '`').join(', ')
						+ "\n\nUse the syntax `help [command name]` to get info on a specific command.",
					footer: {
						text: `Requested by ${msgUser.tag}`,
						icon_url: msgUser.displayAvatarURL({ size: 32 })
					}
				}
			});
		} else {
			if (!commands.has(args[0])) {
				return message.reply(`\`${args[0]}\` is not a valid command.`);
			}

			const command = commands.get(args[0]);
			var cmdInfo = "";
			if (command.description) cmdInfo += `**Description:** ${command.description}\n`;
			if (command.usage) cmdInfo += `**Usage:** \`${command.name} ${command.usage}\`\n`;
			cmdInfo += `**Cooldown:** ${command.cooldown || 5} seconds\n`;
			if (command.aliases) cmdInfo += `**Aliases:** ${command.aliases.join(', ')}\n`;

			return message.channel.send({
				embed: {
					color: 2236962,
					title: "Command info",
					description: cmdInfo,
					footer: {
						text: `Requested by ${msgUser.tag}`,
						icon_url: msgUser.displayAvatarURL({ size: 32 })
					}
				}
			});
		}
	}
};
