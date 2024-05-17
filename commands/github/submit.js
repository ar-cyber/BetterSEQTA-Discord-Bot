import { SlashCommandBuilder } from '@discordjs/builders';
import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import 'dotenv/config';
import crypto from 'node:crypto';
const key = Buffer.from(process.env.GITHUB_PRIVATE_KEY , 'base64').toString('ascii');
const octokit = new Octokit({
	authStrategy: createAppAuth,
	auth: {
		appId: process.env.GITHUB_CLIENT_ID,
		installationId: process.env.GITHUB_INSTALL_ID,
		privateKey: key,
	}
});
export default {
    data: new SlashCommandBuilder()
        .setName('submit')
        .setDescription('Submit a custom theme to GitHub.')
	.addAttachmentOption(option => option.setName('input').setDescription('The theme file to submit.').setRequired(true)),
    async execute(interaction) {
	    if (interaction.member.roles.cache.some(role => role.name === 'Theme Submitter') && interaction.channel.id === "1239895139959443486") {
	    	const interactionUser = await interaction.guild.members.fetch(interaction.user.id)
	    	const attachment = interaction.options.getAttachment('input');
	    	if (attachment.name.split('.').pop() === 'json') {
			interaction.deferReply();
			const jsonFile = await fetch(attachment.url).then(response => response.json());
			const headName = `${interaction.user.id}-${crypto.randomBytes(10).toString('hex')}`;
			const mainRef = await octokit.rest.git.getRef({
  				owner: 'BetterSEQTA',
  				repo: 'BetterSEQTA-Themes',
  				ref: 'heads/main',
			});
	    		await octokit.rest.git.createRef({
				owner: 'BetterSEQTA',
  				repo: 'BetterSEQTA-Themes',
  				ref: `refs/heads/${headName}`,
  				sha: mainRef.data.object.sha,
	    		});
			const newTree = await octokit.rest.git.createTree({
				owner: 'BetterSEQTA',
				repo: 'BetterSEQTA-Themes',
				base_tree: mainRef.data.object.sha,
				tree: [
					{
						path: `store/themes/${interaction.user.id}-${crypto.randomBytes(10).toString('hex')}/theme.json`,
						mode: '100644',
						type: 'blob',
						content: `${JSON.stringify(jsonFile, null, ' ')}`,
					},
				],
			});
			const newCommit = await octokit.rest.git.createCommit({
				owner: 'BetterSEQTA',
				repo: 'BetterSEQTA-Themes',
				message: `Add new theme from user ${interactionUser.user.username}`,
				tree: newTree.data.sha,
				parents: [mainRef.data.object.sha],
				author: {
					name: `${interactionUser.user.username}`,
					email: 'See Discord Server',
					date: new Date().toISOString(),
				},
				committer: {
					name: 'BetterSEQTA+ Bot',
					email: 'See Discord Server',
					date: new Date().toISOString(),
				}

			});
			await octokit.rest.git.updateRef({
				owner: 'BetterSEQTA',
				repo: 'BetterSEQTA-Themes',
				ref: `heads/${headName}`,
				sha: newCommit.data.sha,
			});
			const pullReq = await octokit.rest.pulls.create({
				owner: 'BetterSEQTA',
				repo: 'BetterSEQTA-Themes',
				title: `Add new theme from user ${interactionUser.user.username}`,
				head: headName,
				base: 'main',
				body: `This pull request was automatically created by the BetterSEQTA+ Bot on behalf of ${interactionUser.user.username}, who has the User ID of ${interaction.user.id} on ${new Date().toISOString()}.`,
			});
			interaction.editReply(`Submitted theme as pull request. See it here: ${pullReq.data.html_url}`);
	    	}
	    else {
	    	interaction.reply('Please provide a valid JSON file.');
	    }
	    
	}
	else {
		interaction.reply('You do not have permission to use this command.');
	}
    },
}
