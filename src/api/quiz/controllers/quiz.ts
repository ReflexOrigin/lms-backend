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
  }
}));
