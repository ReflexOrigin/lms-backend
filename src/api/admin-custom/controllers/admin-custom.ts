export default {
  async getStats(ctx: any) {
    const user = ctx.state.user;
    if (!user || user.role?.type !== 'admin_role') {
      return ctx.unauthorized('Only admins can view stats');
    }

    const totalUsers = await strapi.db.query('plugin::users-permissions.user').count();
    const totalCourses = await strapi.db.query('api::course.course').count();
    const totalEnrollments = await strapi.db.query('api::enrollment.enrollment').count();
    const totalLessons = await strapi.db.query('api::lesson.lesson').count();

    return {
      data: {
        totalUsers,
        totalCourses,
        totalEnrollments,
        totalLessons
      }
    };
  },

  async getUsers(ctx: any) {
    const user = ctx.state.user;
    if (!user || user.role?.type !== 'admin_role') {
      return ctx.unauthorized('Only admins can manage users');
    }

    const users = await strapi.db.query('plugin::users-permissions.user').findMany({
      populate: ['role'],
      select: ['id', 'documentId', 'username', 'email', 'createdAt'],
    });

    // Sanitize output (Strapi DB query returns DB models directly)
    return { data: users };
  },

  async updateUserRole(ctx: any) {
    const user = ctx.state.user;
    if (!user || user.role?.type !== 'admin_role') {
      return ctx.unauthorized('Only admins can modify user roles');
    }

    const { id } = ctx.params;
    const { roleId } = ctx.request.body.data || {};

    if (!roleId) {
      return ctx.badRequest('roleId is required');
    }

    const targetUser = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { documentId: id }
    });

    if (!targetUser) {
      return ctx.notFound('User not found');
    }

    const role = await strapi.db.query('plugin::users-permissions.role').findOne({
      where: { id: roleId }
    });

    if (!role) {
      return ctx.badRequest('Role not found');
    }

    const updatedUser = await strapi.db.query('plugin::users-permissions.user').update({
      where: { documentId: id },
      data: {
        role: role.id
      },
      populate: ['role']
    });

    return { data: updatedUser };
  },

  async deleteUser(ctx: any) {
    const user = ctx.state.user;
    if (!user || user.role?.type !== 'admin_role') {
      return ctx.unauthorized('Only admins can delete users');
    }

    const { id } = ctx.params;
    
    // Prevent self deletion just in case
    if (user.documentId === id) {
      return ctx.badRequest('You cannot delete yourself');
    }

    await strapi.db.query('plugin::users-permissions.user').delete({
      where: { documentId: id }
    });

    return { data: { success: true } };
  },

  async suspendUser(ctx: any) {
    const user = ctx.state.user;
    if (!user || user.role?.type !== 'admin_role') {
      return ctx.unauthorized('Only admins can suspend users');
    }

    const { id } = ctx.params;
    const { blocked } = ctx.request.body.data || {};

    if (typeof blocked !== 'boolean') {
      return ctx.badRequest('blocked (boolean) is required');
    }

    // Prevent self-suspension
    if (user.documentId === id) {
      return ctx.badRequest('You cannot suspend yourself');
    }

    const targetUser = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { documentId: id }
    });

    if (!targetUser) {
      return ctx.notFound('User not found');
    }

    const updatedUser = await strapi.db.query('plugin::users-permissions.user').update({
      where: { documentId: id },
      data: { blocked },
      populate: ['role']
    });

    return { data: updatedUser };
  }
};
