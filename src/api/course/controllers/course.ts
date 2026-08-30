import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::course.course', ({ strapi }) => ({
  async find(ctx: any) {
    const user = ctx.state.user;
    console.log('GET /courses query:', JSON.stringify(ctx.query));
    let fullUser = null;
    if (user) {
      fullUser = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: user.id },
        populate: ['role']
      });
    }

    if (fullUser && fullUser.role) {
      if ((fullUser.role.type === 'instructor' || fullUser.role.type === 'content_manager' || fullUser.role.type === 'admin_role') && ctx.request.headers['x-manager-view'] === 'true') {
        const query = { ...ctx.query };
        
        // Use document service to bypass REST API draft permissions
        const filters: any = {
          ...(query.filters as object || {})
        };
        
        // Ensure instructors can only see their own courses
        if (fullUser.role.type === 'instructor') {
          filters.instructor = { documentId: fullUser.documentId };
        }
        
        console.log('Manager course findMany filters:', JSON.stringify(filters, null, 2));
        
        const draftCourses = await strapi.documents('api::course.course').findMany({
          filters,
          populate: query.populate as any,
          status: 'draft'
        });
        
        const pubCourses = await strapi.documents('api::course.course').findMany({
          filters,
          status: 'published'
        });
        
        const pubMap = new Map(pubCourses.map((c: any) => [c.documentId, c.publishedAt]));
        
        for (const c of draftCourses) {
          if (pubMap.has(c.documentId)) {
            c.publishedAt = pubMap.get(c.documentId);
          }
        }
        
        const courses = draftCourses;
        
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
    
    let fullUser = null;
    if (user) {
      fullUser = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: user.id },
        populate: ['role']
      });
    }
    
    if (fullUser && (fullUser.role?.type === 'instructor' || fullUser.role?.type === 'content_manager' || fullUser.role?.type === 'admin_role') && response?.data?.documentId) {
      await strapi.documents('api::course.course').update({
        documentId: response.data.documentId,
        data: { instructor: fullUser.documentId }
      });
    }
    return response;
  }
}));