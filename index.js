const Sequelize = require("sequelize");
const Discord = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");
const Client = new Discord.Client({
    intents : [
        Discord.Intents.FLAGS.GUILDS,
        Discord.Intents.FLAGS.GUILD_MESSAGES,
        Discord.Intents.FLAGS.DIRECT_MESSAGES
    ]
});

const sequelize = new Sequelize('database', 'user', 'password', {
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	// SQLite only
	storage: 'database.sqlite',
});

const Prisoners = sequelize.define('prisoners', {
    id : {type: Sequelize.STRING,
    primaryKey: true,
    allowNull: false,
    unique: true},
    peine : {type: Sequelize.INTEGER,
    allowNull: false}
});

Client.login(process.env.TOKEN);

const ping = new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Renvoie pong");

const help = new SlashCommandBuilder()
    .setName("help")
    .setDescription("Donne la liste des commandes disponibles pour ce bot ainsi que leur utilisation");

const punish = new SlashCommandBuilder()
    .setName("punish")
    .setDescription("Envoie celui qui est mentionné au goulag pour casser un certain nombre de cailloux")
    .addUserOption(option => 
        option.setName("tagged")
        .setDescription("Utilisateur envoyé au goulag")
        .setRequired(true))
    .addNumberOption(option =>
        option.setName("peine")
        .setDescription("Peine en cailloux")
        .setRequired(true))
    .addStringOption(option =>
        option.setName("raison")
        .setDescription("Raison pour laquelle tu l'envoie au goulag")
        .setRequired(false));

const mine = new SlashCommandBuilder()
        .setName("mine")
        .setDescription("pour purger sa peine");

Client.on("ready", async () => {

    Prisoners.sync({force : true});

    Client.guilds.cache.get("913487315932950578").commands.create(ping);
    Client.guilds.cache.get("913487315932950578").commands.create(help);
    Client.guilds.cache.get("913487315932950578").commands.create(punish);
    Client.guilds.cache.get("913487315932950578").commands.create(mine);

    Client.user.setActivity("l'hymne russe", {type: 'LISTENING'});

    console.log("Bot online");
});


Client.on("interactionCreate", async interaction =>{
    if(interaction.isCommand())
    {
        if(interaction.commandName === "ping")
        {
            interaction.reply("pong");
        }
        else if(interaction.commandName === "help")
        {
            const embed = new Discord.MessageEmbed()
            .setTitle('Liste des commandes :')
            .setColor('#0099FF')
            .setDescription('Voici la liste des commandes du bot :')
            .addField("**`'help`**", 'Affiche toutes les commandes du bot')
            .addField("**`'ping`**", 'Renvoie pong')
            .setTimestamp();

            interaction.reply({embeds : [embed]});
        }
        else if(interaction.commandName === "punish")
        {
            let tagged = interaction.options.getMember("tagged");
            let bot = interaction.options.getUser("tagged").bot;
            let author = interaction.member;
            let raison = interaction.options.getString("raison");
            let peine = interaction.options.getNumber("peine");

            if(bot)
            {
                interaction.reply("Les bots ne vont pas au goulag!");
            }
            else if((author.roles.cache.get("918126780718669844") || author.roles.cache.get("918126776956383314")) && author.roles.highest.comparePositionTo(tagged.roles.highest) > 0 && !bot && raison!=undefined && peine > 0)
            {
                interaction.reply("<@" + tagged.id + "> a été envoyé au goulag par <@" + author.id + "> pour " + raison + " à "+ peine + " cailloux!");
                tagged.createDM();
                tagged.send("Tu as été condamné par <@" + author.id + "> à casser " + peine + "cailloux pour " + raison + " .");
                tagged.roles.set(['918126778919317555'])
                .then(console.log)
                .catch(console.error);

                try
                {
                    const prisoner = await Prisoners.create({
                        id: tagged.id,
                        peine: peine,
                    });
                }
                catch (error)
                {
                    if (error.name === 'SequelizeUniqueConstraintError') {
                        return interaction.reply('Cet id existe déjà dans la database');
                    }
                
                    return interaction.reply("Erreur dans l'ajout à la database");
                }
            }
            else if((author.roles.cache.get("918126780718669844") || author.roles.cache.get("918126776956383314")) && author.roles.highest.comparePositionTo(tagged.roles.highest) > 0 && !bot && raison==undefined && peine > 0)
            {
                interaction.reply("<@" + tagged.id + "> a été envoyé au goulag par <@" + author.id + "> à "+ peine + " cailloux!");
                tagged.createDM();
                tagged.send("Tu as été condamné par <@" + author.id + "> à casser " + peine + " cailloux.");
                tagged.roles.set(['918126778919317555'])
                .then(console.log)
                .catch(console.error);

                try
                {
                    const prisoner = await Prisoners.create({
                        id: tagged.id,
                        peine: peine,
                    });
                }
                catch (error)
                {
                    if (error.name === 'SequelizeUniqueConstraintError') {
                        return interaction.reply('Cet id existe déjà dans la database');
                    }
                
                    return interaction.reply("Erreur dans l'ajout à la database");
                }

            }
            else if (peine <= 0)
            {
                interaction.reply("Mets une peine plus élevé, il la mérite!");
            }
            else
            {
                interaction.reply("Tu n'as pas un rôle encore assez élevé <@" + author.id + ">! Contacte un modérateur si besoin.");
            }
        }
        else if(interaction.commandName === "mine")
        {
            if(interaction.member.roles.cache.get("918126778919317555"))
            {
                if(interaction.channelId === "913490835893526548")
                {
                    let member = interaction.member;

                    const prisoner = await Prisoners.findOne({where: {id: member.id}});

                    if(prisoner)
                    {
                        const peineB = prisoner.peine -1;
                        const affectedRows = await Prisoners.update({peine: peineB}, {where: {id : member.id}});
                        if(prisoner.peine > 0)
                        {
                            interaction.reply('Plus que ' + prisoner.peine + ' cailloux à casser, courage!');
                        }
                        else
                        {
                            
                            const rowCount = await Prisoners.destroy({where : {id : member.id}});
                            if(!rowCount)
                            {
                                interaction.reply("Erreur lors de la destruction de ton compte prisonnier.. Parles-en vite à l'informaticien en envoyant un screenshot de ce chat!");
                            }
                            else
                            {
                                member.roles.set(['918126781326843984'])
                                .then(console.log)
                                .catch(console.error);
                                interaction.reply("C'est bon tu est libre!");
                            }
                        }
                    }
                }
                else
                {
                    interaction.reply("Tu dois casser les cailloux dans le salon #『⛏』➣cassage-de-cailloux");
                }
            }
            else
            {
                interaction.reply("T'es pas obligé de casser des cailloux tu sais?")
            }
        }
    }
});


