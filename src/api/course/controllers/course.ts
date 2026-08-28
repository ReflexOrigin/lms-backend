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

        if (Array.isArray(sanitized)) {
          for (let i = 0; i < sanitized.length; i++) {
            const courseDoc = courses[i];
            
            const enrollments = await strapi.documents('api::enrollment.enrollment').findMany({
              filters: { course: { documentId: courseDoc.documentId } }
            });
            sanitized[i].students = enrollments.length;
            sanitized[i].completion = enrollments.length > 0 
              ? Math.round(enrollments.reduce((sum: number, e: any) => sum + (e.progressPercentage || 0), 0) / enrollments.length)
              : 0;
              
            const quizzes = await strapi.documents('api::quiz.quiz').findMany({
              filters: { course: { documentId: courseDoc.documentId } }
            });
            const quizIds = quizzes.map((q: any) => q.documentId);
            if (quizIds.length > 0) {
              const attempts = await strapi.documents('api::quiz-attempt.quiz-attempt').findMany({
                filters: { quiz: { documentId: { $in: quizIds } } }
              });
              sanitized[i].quizAvg = attempts.length > 0
                ? Math.round(attempts.reduce((sum: number, a: any) => sum + Number(a.percentage || 0), 0) / attempts.length)
                : 0;
            } else {
              sanitized[i].quizAvg = 0;
            }
          }
        }
        
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