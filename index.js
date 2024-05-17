import { Client, GatewayIntentBits, Events } from 'discord.js';
import { Collection } from '@discordjs/collection';
import fs from 'node:fs'
import path from 'node:path'
import 'dotenv/config';
const token = process.env.DISCORD_TOKEN
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = fileURLToPath(dirname(import.meta.url));

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent] });

client.commands = new Collection()

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = import(filePath);
		const commandresult = command.then((result) => {
			if (result.default.data && result.default.execute) {

				return result.default.data.name

			} else {

				console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);

			};
		});
		client.commands.set(await commandresult, await command);
	}
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = import(filePath);
	event.then((result) => {

		if (result.default.once) {
			client.once(result.default.name, (...args) => result.default.execute(...args));
		} else {
			client.on(result.default.name, (...args) => result.default.execute(...args));
		}

	})
}

client.login(token);
