import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::course.course', ({ strapi }) => ({
  async find(ctx: any) {
    const user = ctx.state.user;
    if (user && user.role) {
      if (user.role.type === 'instructor') {
        const courses = await strapi.documents('api::course.course').findMany({
          filters: { instructor: { documentId: user.documentId } },
          populate: ctx.query.populate as any
        });
        return { data: courses, meta: {} };
      }
    }
    return super.find(ctx);
  },
  async create(ctx: any) {
    const user = ctx.state.user;
    
    // Remove instructor from body to avoid validation errors if they passed it
    if (ctx.request.body?.data?.instructor) {
      delete ctx.request.body.data.instructor;
    }
    
    const response = await super.create(ctx);
    
    if (user && user.role?.type === 'instructor' && response?.data?.documentId) {
      await strapi.documents('api::course.course').update({
        documentId: response.data.documentId,
        data: { instructor: user.documentId }
      });
    }
    return response;
  }
}));