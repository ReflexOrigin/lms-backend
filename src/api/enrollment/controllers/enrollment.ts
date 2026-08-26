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
  }
}));