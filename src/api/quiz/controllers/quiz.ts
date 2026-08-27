import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::quiz.quiz', ({ strapi }) => ({
  async find(ctx: any) {
    const user = ctx.state.user;
    if (user && user.role) {
      if (user.role.type === 'instructor' && ctx.query.instructorView === 'true') {
        const query = { ...ctx.query };
        delete query.instructorView;
        
        const quizzes = await strapi.documents('api::quiz.quiz').findMany({
          filters: {
            ...(query.filters as object || {}),
            course: { instructor: { documentId: user.documentId } }
          },
          populate: query.populate as any,
          status: 'draft'
        });
        
        const sanitized = await this.sanitizeOutput!(quizzes, ctx);
        return { data: sanitized, meta: {} };
      }
    }
    return super.find(ctx);
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
