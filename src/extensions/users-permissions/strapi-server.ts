module.exports = (plugin: any) => {
  const originalRegister = plugin.controllers.auth.register;

  plugin.controllers.auth.register = async (ctx: any) => {
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

      if (role && ctx.response.body?.user?.id) {
        await strapi.db.query('plugin::users-permissions.user').update({
          where: { id: ctx.response.body.user.id },
          data: { role: role.id }
        });
      }
    }
  };

  const originalMe = plugin.controllers.user.me;
  plugin.controllers.user.me = async (ctx: any) => {
    // Call the original `me` controller to get the base user
    await originalMe(ctx);

    // If successful and we have a user
    if (ctx.response.status === 200 && ctx.response.body) {
      // Fetch the full user with the role populated
      const fullUser = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: ctx.state.user.id },
        populate: ['role'],
      });
      
      // Update the response with the populated user (manually sanitized)
      if (fullUser) {
        delete fullUser.password;
        delete fullUser.resetPasswordToken;
        delete fullUser.confirmationToken;
        ctx.response.body = fullUser;
      }
    }
  };

  return plugin;
};
