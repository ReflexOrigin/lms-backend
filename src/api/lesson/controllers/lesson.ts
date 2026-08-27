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
      if (!course || (course as any).instructor?.id !== user.id) {
        return ctx.forbidden('You can only add lessons to your own courses.');
      }
    }

    if (courseId) {
      const requestedOrder = ctx.request.body?.data?.order;
      const courseEntity = await strapi.db.query('api::course.course').findOne({
        where: { documentId: courseId },
        select: ['id']
      });
      
      if (courseEntity) {
        const existingLessons = await strapi.db.query('api::lesson.lesson').findMany({
          where: { course: courseEntity.id },
          select: ['order']
        });
        
        const takenOrders = new Set(existingLessons.map(l => l.order));
        
        if (requestedOrder === undefined || requestedOrder === null || takenOrders.has(Number(requestedOrder))) {
          let nextOrder = 0;
          if (existingLessons.length > 0) {
            nextOrder = Math.max(...existingLessons.map(l => l.order || 0)) + 1;
          }
          if (!ctx.request.body.data) ctx.request.body.data = {};
          ctx.request.body.data.order = nextOrder;
        }
      }
    }
    
    return super.create(ctx);
  },

  async update(ctx: any) {
    const requestedOrder = ctx.request.body?.data?.order;
    const documentId = ctx.params.id; // Strapi v5 uses documentId in route params

    if (requestedOrder !== undefined && requestedOrder !== null) {
      const currentLesson = await strapi.db.query('api::lesson.lesson').findOne({
        where: { documentId },
        populate: ['course']
      });

      if (currentLesson && currentLesson.course) {
        const existingLessons = await strapi.db.query('api::lesson.lesson').findMany({
          where: { 
            course: currentLesson.course.id,
            id: { $ne: currentLesson.id }
          },
          select: ['order']
        });
        
        const takenOrders = new Set(existingLessons.map(l => l.order));
        if (takenOrders.has(Number(requestedOrder))) {
          let nextOrder = 0;
          if (existingLessons.length > 0) {
            nextOrder = Math.max(...existingLessons.map(l => l.order || 0)) + 1;
          }
          ctx.request.body.data.order = nextOrder;
        }
      }
    }

    return super.update(ctx);
  },

  async publishLesson(ctx: any) {
    const { documentId } = ctx.params;
    const published = await (strapi.documents('api::lesson.lesson') as any).publish({ documentId });
    return { data: published };
  },
  
  async unpublishLesson(ctx: any) {
    const { documentId } = ctx.params;
    const unpublished = await (strapi.documents('api::lesson.lesson') as any).unpublish({ documentId });
    return { data: unpublished };
  }
}));
