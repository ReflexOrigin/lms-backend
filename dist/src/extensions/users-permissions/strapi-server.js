"use strict";
module.exports = (plugin) => {
    const originalRegister = plugin.controllers.auth.register;
    plugin.controllers.auth.register = async (ctx) => {
        var _a, _b;
        // 1. Extract requested role from query parameter
        const requestedRole = ctx.request.query.requestedRole || 'authenticated';
        // Hard whitelist for self-registration
        const ALLOWED_ROLES = ['authenticated', 'instructor'];
        if (!ALLOWED_ROLES.includes(requestedRole)) {
            return ctx.badRequest('Invalid role requested');
        }
        // 2. Call the original register controller (creates user with default role)
        await originalRegister(ctx);
        // 3. If registration was successful and they wanted a non-default role, update it
        if (ctx.response.status === 200 && requestedRole !== 'authenticated') {
            const roleService = strapi.db.query('plugin::users-permissions.role');
            const role = await roleService.findOne({ where: { type: requestedRole } });
            if (role && ((_b = (_a = ctx.response.body) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.id)) {
                await strapi.db.query('plugin::users-permissions.user').update({
                    where: { id: ctx.response.body.user.id },
                    data: { role: role.id }
                });
            }
        }
    };
    return plugin;
};
