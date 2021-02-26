module.exports = function (config) {
    if (config == null) {
        config = {
            database: '',
            username: '',
            password: '',
            dialect: 'sqlite',
            host: '127.0.0.1',
            port: 3306
        }
    }

    var SQ = {}

    const Sequelize = require('sequelize');
    const sequelize = new Sequelize(config.database, config.username, config.password, {
        dialect: config.dialect,
        host: config.host,
        port: config.port,
        pool: {
            max: 100,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        storage: 'db.sqlite',
        logging: false
    });

    SQ.Op = Sequelize.Op;

    SQ.Customer = sequelize.define('customer', {
        steamid: Sequelize.STRING,
        sync_token: Sequelize.STRING
    });

    SQ.Guild = sequelize.define('guild', {
        guild_id: Sequelize.STRING,
        sync_token: Sequelize.STRING,
        url: Sequelize.STRING
    });

    sequelize.sync({ force: false }).then(console.log('Database initialized.'))

    return SQ;
}
