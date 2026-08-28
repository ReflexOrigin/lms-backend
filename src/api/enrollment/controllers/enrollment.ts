import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::enrollment.enrollment', ({ strapi }) => ({
  async create(ctx: any) {
    const user = ctx.state.user;
    if (ctx.request.body?.data?.student) delete ctx.request.body.data.student;
    
    ctx.request.body.data = { 
      ...ctx.request.body.data, 
      enrolledAt: new Date().toISOString()
    };
    
    const response = await super.create(ctx);
    
    if (user && response?.data?.documentId) {
      await strapi.db.query('api::enrollment.enrollment').update({
        where: { documentId: response.data.documentId },
        data: { student: user.id }
      });
    }
    
    return response;
  },

  async find(ctx: any) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();

    const fullUser = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: user.id },
      populate: ['role']
    });

    if (fullUser?.role?.type === 'student' || fullUser?.role?.type === 'authenticated') {
      ctx.query.filters = {
        ...(ctx.query.filters as object || {}),
        student: user.id,
      };
    } else if (fullUser?.role?.type === 'instructor') {
      const instructorCourses = await strapi.db.query('api::course.course').findMany({
        where: { instructor: user.id },
        select: ['id', 'documentId']
      });
      const courseIds = instructorCourses.map((c: any) => c.documentId);
      
      ctx.query.filters = {
        ...(ctx.query.filters as object || {}),
        course: { documentId: { $in: courseIds.length > 0 ? courseIds : ['none'] } }
      };
    }

    return super.find(ctx);
  },

  async findOne(ctx: any) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();

    const response = await super.findOne(ctx);
    if (!response || !response.data) return response;

    const fullUser = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: user.id },
      populate: ['role']
    });

    if (fullUser?.role?.type === 'student' || fullUser?.role?.type === 'authenticated') {
      const dbEntity = await strapi.db.query('api::enrollment.enrollment').findOne({
        where: { documentId: ctx.params.id },
        populate: ['student']
      });

      if (!dbEntity || !dbEntity.student || dbEntity.student.id !== user.id) {
        return ctx.forbidden('You are not authorized to view this enrollment.');
      }
    } else if (fullUser?.role?.type === 'instructor') {
      const dbEntity = await strapi.documents('api::enrollment.enrollment').findOne({
        documentId: ctx.params.id,
        populate: { course: { populate: ['instructor'] } }
      });
      if (!dbEntity || !dbEntity.course || (dbEntity.course as any).instructor?.documentId !== fullUser.documentId) {
        return ctx.forbidden('You are not authorized to view this enrollment.');
      }
    }

    return response;
  }
}));