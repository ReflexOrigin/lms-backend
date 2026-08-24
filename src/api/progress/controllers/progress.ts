import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::progress.progress', ({ strapi }) => ({
  async create(ctx: any) {
    const user = ctx.state.user;
    if (ctx.request.body?.data?.student) delete ctx.request.body.data.student;
    const response = await super.create(ctx);
    if (user && response?.data?.documentId) {
      await strapi.documents('api::progress.progress').update({
        documentId: response.data.documentId,
        data: { student: user.documentId }
      });
    }
    return response;
  },
  async update(ctx: any) {
    const user = ctx.state.user;
    const { id } = ctx.params;
    const progress = await strapi.documents('api::progress.progress').findOne({ documentId: id, populate: ['student'] });
    if (!progress || progress.student?.documentId !== user.documentId) {
      return ctx.forbidden('Not your progress');
    }
    if (ctx.request.body?.data?.student) delete ctx.request.body.data.student;
    return super.update(ctx); // student is already attached anyway
  }
}));