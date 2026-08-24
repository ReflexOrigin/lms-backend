import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::quiz-attempt.quiz-attempt', ({ strapi }) => ({
  async create(ctx: any) {
    const user = ctx.state.user;
    if (ctx.request.body?.data?.student) delete ctx.request.body.data.student;
    ctx.request.body.data = { ...ctx.request.body.data, attemptedAt: new Date().toISOString() };
    const response = await super.create(ctx);
    if (user && response?.data?.documentId) {
      await strapi.documents('api::quiz-attempt.quiz-attempt').update({
        documentId: response.data.documentId,
        data: { student: user.documentId }
      });
    }
    return response;
  }
}));