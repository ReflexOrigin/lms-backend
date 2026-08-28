"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const strapi_1 = require("@strapi/strapi");
exports.default = strapi_1.factories.createCoreController('api::progress.progress', ({ strapi }) => ({
    async create(ctx) {
        const user = ctx.state.user;
        if (!user)
            return ctx.unauthorized('Not logged in');
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
        if (!lesson || !lesson.course || lesson.course.documentId !== data.course) {
            return ctx.badRequest('Lesson does not belong to the specified course.');
        }
        const courseId = lesson.course.id;
        const lessonId = lesson.id;
        // 3. Idempotent Upsert & Auto-Completion
        let completionPercentage = parseFloat(data.completionPercentage || 0);
        let completed = false;
        let status = 'in_progress';
        if (completionPercentage >= 90 || data.completed === true) {
            completed = true;
            status = 'completed';
            completionPercentage = 100;
        }
        else if (completionPercentage === 0) {
            status = 'not_started';
        }
        const existingProgress = await strapi.db.query('api::progress.progress').findOne({
            where: {
                student: user.id,
                lesson: lessonId
            }
        });
        let response;
        const progressData = {
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
        }
        else if (existingProgress && existingProgress.completedAt) {
            progressData.completedAt = existingProgress.completedAt;
        }
        if (existingProgress) {
            response = await strapi.db.query('api::progress.progress').update({
                where: { id: existingProgress.id },
                data: progressData
            });
            response = { data: response, meta: {} };
        }
        else {
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
    async update(ctx) {
        return ctx.badRequest('Use POST /progresses for idempotent upsert.');
    },
    async find(ctx) {
        var _a, _b, _c, _d, _e, _f;
        const user = ctx.state.user;
        if (!user)
            return ctx.unauthorized();
        // Extract basic pagination and course filter from standard query
        const page = ((_a = ctx.query.pagination) === null || _a === void 0 ? void 0 : _a.page) ? parseInt(ctx.query.pagination.page) : 1;
        const pageSize = ((_b = ctx.query.pagination) === null || _b === void 0 ? void 0 : _b.pageSize) ? parseInt(ctx.query.pagination.pageSize) : 25;
        // Aggressively search for the course documentId filter in ctx.query
        let courseIdFilter = null;
        const f = ctx.query.filters;
        if (f && f.course && f.course.documentId) {
            if (typeof f.course.documentId === 'string') {
                courseIdFilter = f.course.documentId;
            }
            else if (f.course.documentId.$eq) {
                courseIdFilter = f.course.documentId.$eq;
            }
            else if (Array.isArray(f.course.documentId)) {
                courseIdFilter = f.course.documentId[0];
            }
        }
        const fullUser = await strapi.db.query('plugin::users-permissions.user').findOne({
            where: { id: user.id },
            populate: ['role']
        });
        const where = {};
        if (((_c = fullUser === null || fullUser === void 0 ? void 0 : fullUser.role) === null || _c === void 0 ? void 0 : _c.type) === 'student' || ((_d = fullUser === null || fullUser === void 0 ? void 0 : fullUser.role) === null || _d === void 0 ? void 0 : _d.type) === 'authenticated') {
            where.student = user.id;
        }
        else if (((_e = fullUser === null || fullUser === void 0 ? void 0 : fullUser.role) === null || _e === void 0 ? void 0 : _e.type) === 'instructor') {
            where.course = { instructor: user.id };
        }
        if (courseIdFilter) {
            const courseWhere = { documentId: courseIdFilter };
            if (((_f = fullUser === null || fullUser === void 0 ? void 0 : fullUser.role) === null || _f === void 0 ? void 0 : _f.type) === 'instructor') {
                courseWhere.instructor = user.id;
            }
            const courseMatch = await strapi.db.query('api::course.course').findOne({
                where: courseWhere
            });
            if (courseMatch) {
                where.course = courseMatch.id;
            }
            else {
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
