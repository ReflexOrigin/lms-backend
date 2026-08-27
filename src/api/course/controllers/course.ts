import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::course.course', ({ strapi }) => ({
  async find(ctx: any) {
    const user = ctx.state.user;
    console.log('GET /courses query:', JSON.stringify(ctx.query));
    if (user && user.role) {
      if (user.role.type === 'instructor' && ctx.query.instructorView === 'true') {
        const query = { ...ctx.query };
        delete query.instructorView;
        
        // Use document service to bypass REST API draft permissions for instructors
        const filters = {
          ...(query.filters as object || {}),
          instructor: { documentId: user.documentId }
        };
        console.log('Instructor course findMany filters:', JSON.stringify(filters, null, 2));
        
        const courses = await strapi.documents('api::course.course').findMany({
          filters,
          populate: query.populate as any,
          status: 'draft'
        });
        
        console.log('Found courses count:', courses.length);
        
        const sanitized = await this.sanitizeOutput!(courses, ctx);
        return { data: sanitized, meta: {} };
      }
    }
    return super.find(ctx);
  },
  
  async publishCourse(ctx: any) {
    const { documentId } = ctx.params;
    const published = await strapi.documents('api::course.course').publish({ documentId });
    return { data: published };
  },
  
  async unpublishCourse(ctx: any) {
    const { documentId } = ctx.params;
    const unpublished = await strapi.documents('api::course.course').unpublish({ documentId });
    return { data: unpublished };
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