import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::progress.progress', ({ strapi }) => ({
  async create(ctx: any) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Not logged in');

    const { data } = ctx.request.body;
    if (!data.lesson || !data.course) {
      return ctx.badRequest('lesson and course are required');
    }

    // 1. Enrollment Validation
    const enrollment = await strapi.db.query('api::enrollment.enrollment').findOne({
      where: {
        student: user.id,
        course: { documentId: data.course }
      }
    });

    if (!enrollment) {
      return ctx.forbidden('You are not enrolled in this course.');
    }

    // 2. Lesson belongs to course validation
    const lesson = await strapi.documents('api::lesson.lesson').findOne({
      documentId: data.lesson,
      populate: ['course']
    });

    if (!lesson || !(lesson as any).course || (lesson as any).course.documentId !== data.course) {
      return ctx.badRequest('Lesson does not belong to the specified course.');
    }

    const courseId = (lesson as any).course.id;
    const lessonId = lesson.id;

    // 3. Idempotent Upsert & Auto-Completion
    let completionPercentage = parseFloat(data.completionPercentage || 0);
    let completed = false;
    let status = 'in_progress';
    
    if (completionPercentage >= 90 || data.completed === true) {
      completed = true;
      status = 'completed';
      completionPercentage = 100;
    } else if (completionPercentage === 0) {
      status = 'not_started';
    }

    const existingProgress = await strapi.db.query('api::progress.progress').findOne({
      where: {
        student: user.id,
        lesson: lessonId
      }
    });

    let response;
    const progressData: any = {
      student: user.id,
      course: courseId,
      lesson: lessonId,
      completed,
      status,
      completionPercentage,
      completedAt: completed ? new Date().toISOString() : null,
    };

    if (completed && (!existingProgress || !existingProgress.completed)) {
      progressData.completedAt = new Date().toISOString();
    } else if (existingProgress && existingProgress.completedAt) {
      progressData.completedAt = existingProgress.completedAt;
    }

    if (existingProgress) {
      response = await strapi.db.query('api::progress.progress').update({
        where: { id: existingProgress.id },
        data: progressData
      });
      response = { data: response, meta: {} };
    } else {
      response = await strapi.db.query('api::progress.progress').create({
        data: progressData
      });
      response = { data: response, meta: {} };
    }

    // 4. Recalculate Course Progress and Update Enrollment
    const publishedLessons = await strapi.documents('api::lesson.lesson').findMany({
      filters: { course: { documentId: data.course } },
      status: 'published',
      fields: ['documentId'] // only fetch IDs to save memory
    });
    const totalLessons = publishedLessons.length;

    const completedLessons = await strapi.db.query('api::progress.progress').count({
      where: {
        student: user.id,
        course: { id: courseId },
        completed: true
      }
    });

    const overallPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    await strapi.db.query('api::enrollment.enrollment').update({
      where: { id: enrollment.id },
      data: { progressPercentage: overallPercentage }
    });

    return response;
  },

  async update(ctx: any) {
    return ctx.badRequest('Use POST /progresses for idempotent upsert.');
  },

  async find(ctx: any) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();

    // Extract basic pagination and course filter from standard query
    const page = ctx.query.pagination?.page ? parseInt(ctx.query.pagination.page) : 1;
    const pageSize = ctx.query.pagination?.pageSize ? parseInt(ctx.query.pagination.pageSize) : 25;
    // Aggressively search for the course documentId filter in ctx.query
    let courseIdFilter = null;
    const f = ctx.query.filters;
    if (f && f.course && f.course.documentId) {
      if (typeof f.course.documentId === 'string') {
        courseIdFilter = f.course.documentId;
      } else if (f.course.documentId.$eq) {
        courseIdFilter = f.course.documentId.$eq;
      } else if (Array.isArray(f.course.documentId)) {
        courseIdFilter = f.course.documentId[0];
      }
    }

    const fullUser = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: user.id },
      populate: ['role']
    });

    const where: any = {};
    if (fullUser?.role?.type === 'student' || fullUser?.role?.type === 'authenticated') {
      where.student = user.id;
    } else if (fullUser?.role?.type === 'instructor') {
      const instructorCourses = await strapi.db.query('api::course.course').findMany({
        where: { instructor: user.id },
        select: ['id']
      });
      const courseIds = instructorCourses.map((c: any) => c.id);
      where.course = { id: { $in: courseIds.length > 0 ? courseIds : [-1] } };
    }

    if (courseIdFilter) {
      const courseWhere: any = { documentId: courseIdFilter };
      if (fullUser?.role?.type === 'instructor') {
        courseWhere.instructor = user.id;
      }
      const courseMatch = await strapi.db.query('api::course.course').findOne({
        where: courseWhere
      });
      if (courseMatch) {
        where.course = courseMatch.id;
      } else {
        // Force no results if course not found or not owned by instructor
        where.course = 0; 
      }
    }

    const [entries, total] = await Promise.all([
      strapi.db.query('api::progress.progress').findMany({
        where,
        populate: { course: true, lesson: true },
        offset: (page - 1) * pageSize,
        limit: pageSize,
      }),
      // Count total for pagination metadata
      strapi.db.query('api::progress.progress').count({ where })
    ]);

    return {
      data: entries,
      meta: {
        pagination: {
          page,
          pageSize,
          pageCount: Math.ceil(total / pageSize),
          total
        }
      }
    };
  }
}));