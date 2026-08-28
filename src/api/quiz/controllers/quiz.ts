import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::quiz.quiz', ({ strapi }) => ({
  async find(ctx: any) {
    const user = ctx.state.user;
    if (user) {
      const fullUser = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: user.id },
        populate: ['role']
      });
      
      if ((fullUser?.role?.type === 'instructor' || fullUser?.role?.type === 'content_manager' || fullUser?.role?.type === 'admin_role') && ctx.query.managerView === 'true') {
        const query = { ...ctx.query };
        delete query.managerView;
        
        const filters: any = {
          ...(query.filters as object || {})
        };
        
        if (fullUser.role.type === 'instructor') {
          filters.course = { instructor: { documentId: fullUser.documentId } };
        }
        
        const draftQuizzes = await strapi.documents('api::quiz.quiz').findMany({
          filters,
          populate: query.populate as any,
          status: 'draft'
        });
        
        const pubQuizzes = await strapi.documents('api::quiz.quiz').findMany({
          filters,
          status: 'published'
        });
        
        const pubMap = new Map(pubQuizzes.map((q: any) => [q.documentId, q.publishedAt]));
        
        for (const q of draftQuizzes) {
          if (pubMap.has(q.documentId)) {
            q.publishedAt = pubMap.get(q.documentId);
          }
        }
        
        const quizzes = draftQuizzes;
        
        const sanitized = await this.sanitizeOutput!(quizzes, ctx);
        return { data: sanitized, meta: {} };
      } else if (fullUser?.role?.type === 'student' || fullUser?.role?.type === 'authenticated') {
        const enrollments = await strapi.db.query('api::enrollment.enrollment').findMany({
          where: { student: user.id },
          populate: ['course']
        });
        
        const enrolledCourseIds = enrollments.map((e: any) => e.course?.id).filter(Boolean);
        
        if (enrolledCourseIds.length === 0) {
          return { data: [], meta: { pagination: { page: 1, pageSize: 25, pageCount: 0, total: 0 } } };
        }
        
        ctx.query.filters = {
          ...(ctx.query.filters as object || {}),
          course: { id: { $in: enrolledCourseIds } }
        };
      }
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
      const quiz = await strapi.documents('api::quiz.quiz').findOne({
        documentId: ctx.params.id,
        populate: ['course']
      });
      
      if (quiz && (quiz as any).course) {
        const enrollment = await strapi.db.query('api::enrollment.enrollment').findOne({
          where: { student: user.id, course: (quiz as any).course.id }
        });
        if (!enrollment) {
          return ctx.forbidden('You are not enrolled in the course for this quiz.');
        }
      } else if (!quiz) {
         return ctx.notFound();
      }
    }
    return response;
  },

  async create(ctx: any) {
    const user = ctx.state.user;
    
    // Check if the user is an instructor
    if (user && user.role?.type === 'instructor') {
      const courseId = ctx.request.body?.data?.course;
      
      if (!courseId) {
        return ctx.badRequest('A course must be specified when creating a quiz');
      }
      
      // Verify the instructor owns this course
      const course = await strapi.documents('api::course.course').findOne({
        documentId: courseId,
        populate: ['instructor']
      });
      
      if (!course) {
        return ctx.badRequest('Course not found');
      }
      
      if ((course as any).instructor?.id !== user.id) {
        return ctx.unauthorized('You can only create quizzes for your own courses');
      }
    }
    
    return super.create(ctx);
  }
}));
