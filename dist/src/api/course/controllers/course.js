"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const strapi_1 = require("@strapi/strapi");
exports.default = strapi_1.factories.createCoreController('api::course.course', ({ strapi }) => ({
    async find(ctx) {
        const user = ctx.state.user;
        console.log('GET /courses query:', JSON.stringify(ctx.query));
        if (user && user.role) {
            if ((user.role.type === 'instructor' || user.role.type === 'content_manager' || user.role.type === 'admin_role') && ctx.request.headers['x-manager-view'] === 'true') {
                const query = { ...ctx.query };
                // Use document service to bypass REST API draft permissions
                const filters = {
                    ...(query.filters || {})
                };
                // Ensure instructors can only see their own courses
                if (user.role.type === 'instructor') {
                    filters.instructor = { documentId: user.documentId };
                }
                console.log('Manager course findMany filters:', JSON.stringify(filters, null, 2));
                const draftCourses = await strapi.documents('api::course.course').findMany({
                    filters,
                    populate: query.populate,
                    status: 'draft'
                });
                const pubCourses = await strapi.documents('api::course.course').findMany({
                    filters,
                    status: 'published'
                });
                const pubMap = new Map(pubCourses.map((c) => [c.documentId, c.publishedAt]));
                for (const c of draftCourses) {
                    if (pubMap.has(c.documentId)) {
                        c.publishedAt = pubMap.get(c.documentId);
                    }
                }
                const courses = draftCourses;
                console.log('Found courses count:', courses.length);
                const sanitized = await this.sanitizeOutput(courses, ctx);
                if (Array.isArray(sanitized)) {
                    for (let i = 0; i < sanitized.length; i++) {
                        const courseDoc = courses[i];
                        const enrollments = await strapi.documents('api::enrollment.enrollment').findMany({
                            filters: { course: { documentId: courseDoc.documentId } }
                        });
                        sanitized[i].students = enrollments.length;
                        sanitized[i].completion = enrollments.length > 0
                            ? Math.round(enrollments.reduce((sum, e) => sum + (e.progressPercentage || 0), 0) / enrollments.length)
                            : 0;
                        const quizzes = await strapi.documents('api::quiz.quiz').findMany({
                            filters: { course: { documentId: courseDoc.documentId } }
                        });
                        const quizIds = quizzes.map((q) => q.documentId);
                        if (quizIds.length > 0) {
                            const attempts = await strapi.documents('api::quiz-attempt.quiz-attempt').findMany({
                                filters: { quiz: { documentId: { $in: quizIds } } }
                            });
                            sanitized[i].quizAvg = attempts.length > 0
                                ? Math.round(attempts.reduce((sum, a) => sum + Number(a.percentage || 0), 0) / attempts.length)
                                : 0;
                        }
                        else {
                            sanitized[i].quizAvg = 0;
                        }
                    }
                }
                return { data: sanitized, meta: {} };
            }
        }
        return super.find(ctx);
    },
    async publishCourse(ctx) {
        const { documentId } = ctx.params;
        const published = await strapi.documents('api::course.course').publish({ documentId });
        return { data: published };
    },
    async unpublishCourse(ctx) {
        const { documentId } = ctx.params;
        const unpublished = await strapi.documents('api::course.course').unpublish({ documentId });
        return { data: unpublished };
    },
    async create(ctx) {
        var _a, _b, _c, _d;
        const user = ctx.state.user;
        // Remove instructor from body to avoid validation errors if they passed it
        if ((_b = (_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.instructor) {
            delete ctx.request.body.data.instructor;
        }
        const response = await super.create(ctx);
        if (user && ((_c = user.role) === null || _c === void 0 ? void 0 : _c.type) === 'instructor' && ((_d = response === null || response === void 0 ? void 0 : response.data) === null || _d === void 0 ? void 0 : _d.documentId)) {
            await strapi.documents('api::course.course').update({
                documentId: response.data.documentId,
                data: { instructor: user.documentId }
            });
        }
        return response;
    }
}));
