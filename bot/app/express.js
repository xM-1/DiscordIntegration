module.exports = function (SQ, gms_extra, client, api_port) {
    const crypto = require('crypto')
    const express = require('express')
    const app = express()
    app.use(express.urlencoded({ extended: true }))
    var syncTokenCache = []

    const authMiddleware = function (req, res, next) {
        SQ.Guild.findOne({ where: { sync_token: req.headers.authorization.replace('Bearer ', '') } }).then(guild => {
            if (guild !== null) {
                req.guild = guild;
                next();
            } else {
                res.status(401).json({ status: 'unauthenticated' });
            }
        })
    }

    app.get('/', (req, res) => {
        res.redirect('https://gmodstore.com/market/view/6122')
    })

    /**
     * Generate a sync token
     * 
     * This endpoint is called when the script is downloaded. Used only for the shared instance.
     */
    app.post('/api/generatesynctoken', (req, res) => {
        if (req.body.extra === gms_extra && gms_extra != null) {
            if (req.body.steamid in syncTokenCache) {
                return res.send(syncTokenCache[req.body.steamid]);
            }
            var newSyncToken = crypto.createHmac('sha256', crypto.randomBytes(20).toString('hex')).digest('hex'); // 114190443
            syncTokenCache[req.body.steamid] = newSyncToken;
            setTimeout(() => { delete syncTokenCache[req.body.steamid]; }, 1000 * 60)
            SQ.Customer.findOne({ where: { steamid: req.body.steamid } }).then(customer => {
                if (customer === null) {
                    SQ.Customer.create({
                        steamid: req.body.steamid,
                        sync_token: newSyncToken
                    })
                } else {
                    SQ.Guild.findOne({ where: { sync_token: customer.sync_token } }).then(guild => {
                        if (guild !== null) {
                            guild.update({
                                sync_token: newSyncToken
                            })
                        }
                    })
                    customer.update({
                        sync_token: newSyncToken
                    })
                }
            })
            res.send(newSyncToken);
        } else {
            res.status(401).json({ status: 'unauthenticated' });
        }
    })

    /**
     * Validate connection & token
     */
    app.get('/api/connectioncheck', authMiddleware, (req, res) => {
        res.json({ status: 'success' });
    })

    /**
     * Handle a user sync request
     * 
     * Assigns roles to a user by ID. Responds with a list of the IDs of the roles the user previously had.
     */
    app.post('/api/users/:discordid/roles/sync', authMiddleware, async (req, res) => {
        dg = await client.guilds.fetch(req.guild.guild_id);
        mb = await dg.members.fetch(req.params.discordid).catch(e => null);
        if (mb == null) return res.json({ status: 'failure' });

        let initialRoles = [];
        mb.roles.cache.map((role) => {
            if (role.name == '@everyone') { return }
            initialRoles.push(role.id)
        })

        if (req.body.roles) {
            req.body.roles.map(id => {
                role = dg.roles.cache.find(r => r.id === id);
                mb.roles.add(role).catch(console.error);
            })
        }

        res.json({ status: 'success', roles: initialRoles });
    })

    /**
     * Add role to user
     */
    app.post('/api/users/:discordid/roles', authMiddleware, async (req, res) => {
        try {
            dg = await client.guilds.fetch(req.guild.guild_id);
            mb = await dg.members.fetch(req.params.discordid);

            role = dg.roles.cache.find(r => r.id === req.body.id);
            if (role != null)
                mb.roles.add(role).catch(console.error);

            res.json({ status: 'success', roles: mb.roles });
        } catch (e) {
            res.json({ status: 'failure' });
        }
    })

    /**
     * Delete role from user
     */
    app.delete('/api/users/:discordid/roles/:id', authMiddleware, async (req, res) => {
        dg = await client.guilds.fetch(req.guild.guild_id);
        mb = await dg.members.fetch(req.params.discordid);

        role = dg.roles.cache.find(r => r.id === req.params.id);
        if (role != null)
            mb.roles.remove(role).catch(console.error);

        res.json({ status: 'success' });
    })

    /**
     * Get all roles
     * 
     * Returns an object of role names keyed with corresponding IDs.
     * Used for the settings page.
     */
    app.get('/api/roles', authMiddleware, async (req, res) => {
        dg = await client.guilds.fetch(req.guild.guild_id);
        let roles = {};
        dg.roles.cache.map(r => {
            if (r.name != '@everyone')
                roles[r.id] = r.name;
        });
        res.json({ status: 'success', roles: roles });
    })

    /**
     * Create a role
     */
    app.post('/api/roles', authMiddleware, async (req, res) => {
        dg = await client.guilds.fetch(req.guild.guild_id);

        let name = req.body.name;
        let color = parseInt(req.body.color.replace('#', ''), 16)

        dg.roles.create({ data: { name, color } })
            .then(role => {
                res.json({ status: 'success', role });
            })
            .catch(err => {
                console.error(err);
                res.json({ status: 'failure', message: err });
            });
    })

    /**
     * Update a role
     */
    app.post('/api/roles/:id', authMiddleware, async (req, res) => {
        dg = await client.guilds.fetch(req.guild.guild_id);

        let name = req.body.name;
        let color = parseInt(req.body.color.replace('#', ''), 16)

        let role = dg.roles.cache.find((r) => r.id === req.params.id);
        if (role != null)
            role.edit({ name, color })
                .then(role => {
                    res.json({ status: 'success', role });
                })
                .catch(err => {
                    console.error(err);
                    res.json({ status: 'failure', message: err });
                });
    })

    app.listen(api_port, () => console.log(`API listening on port ${api_port}.`))
};
