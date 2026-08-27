import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::lesson.lesson', ({ strapi }) => ({
  async find(ctx: any) {
    const user = ctx.state.user;
    if (user && user.role) {
      if (user.role.type === 'instructor' && ctx.query.instructorView === 'true') {
        const query = { ...ctx.query };
        delete query.instructorView;
        
        const lessons = await strapi.documents('api::lesson.lesson').findMany({
          filters: {
            ...(query.filters as object || {}),
            course: { instructor: { documentId: user.documentId } }
          },
          populate: query.populate as any,
          status: 'draft'
        });
        
        const sanitized = await this.sanitizeOutput!(lessons, ctx);
        return { data: sanitized, meta: {} };
      }
    }
    return super.find(ctx);
  },

  async create(ctx: any) {
    const user = ctx.state.user;
    const courseId = ctx.request.body?.data?.course;

    if (user?.role?.type === 'instructor') {
      if (!courseId) return ctx.badRequest('Course is required');
      const course = await strapi.documents('api::course.course').findOne({
        documentId: courseId,
        populate: ['instructor']
      });
      if (!course || (course as any).instructor?.documentId !== user.documentId) {
        return ctx.forbidden('You can only add lessons to your own courses.');
      }
    }
    
    return super.create(ctx);
  },

  async publishLesson(ctx: any) {
    const { documentId } = ctx.params;
    const published = await strapi.documents('api::lesson.lesson').publish({ documentId });
    return { data: published };
  },
  
  async unpublishLesson(ctx: any) {
    const { documentId } = ctx.params;
    const unpublished = await strapi.documents('api::lesson.lesson').unpublish({ documentId });
    return { data: unpublished };
  }
}));
