"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const strapi_1 = require("@strapi/strapi");
exports.default = strapi_1.factories.createCoreController('api::quiz.quiz', ({ strapi }) => ({
    async find(ctx) {
        var _a, _b, _c, _d, _e;
        const user = ctx.state.user;
        if (user) {
            const fullUser = await strapi.db.query('plugin::users-permissions.user').findOne({
                where: { id: user.id },
                populate: ['role']
            });
            if ((((_a = fullUser === null || fullUser === void 0 ? void 0 : fullUser.role) === null || _a === void 0 ? void 0 : _a.type) === 'instructor' || ((_b = fullUser === null || fullUser === void 0 ? void 0 : fullUser.role) === null || _b === void 0 ? void 0 : _b.type) === 'content_manager' || ((_c = fullUser === null || fullUser === void 0 ? void 0 : fullUser.role) === null || _c === void 0 ? void 0 : _c.type) === 'admin_role') && ctx.query.managerView === 'true') {
                const query = { ...ctx.query };
                delete query.managerView;
                const filters = {
                    ...(query.filters || {})
                };
                if (fullUser.role.type === 'instructor') {
                    filters.course = { instructor: { documentId: fullUser.documentId } };
                }
                const draftQuizzes = await strapi.documents('api::quiz.quiz').findMany({
                    filters,
                    populate: query.populate,
                    status: 'draft'
                });
                const pubQuizzes = await strapi.documents('api::quiz.quiz').findMany({
                    filters,
                    status: 'published'
                });
                const pubMap = new Map(pubQuizzes.map((q) => [q.documentId, q.publishedAt]));
                for (const q of draftQuizzes) {
                    if (pubMap.has(q.documentId)) {
                        q.publishedAt = pubMap.get(q.documentId);
                    }
                }
                const quizzes = draftQuizzes;
                const sanitized = await this.sanitizeOutput(quizzes, ctx);
                return { data: sanitized, meta: {} };
            }
            else if (((_d = fullUser === null || fullUser === void 0 ? void 0 : fullUser.role) === null || _d === void 0 ? void 0 : _d.type) === 'student' || ((_e = fullUser === null || fullUser === void 0 ? void 0 : fullUser.role) === null || _e === void 0 ? void 0 : _e.type) === 'authenticated') {
                const enrollments = await strapi.db.query('api::enrollment.enrollment').findMany({
                    where: { student: user.id },
                    populate: ['course']
                });
                const enrolledCourseIds = enrollments.map((e) => { var _a; return (_a = e.course) === null || _a === void 0 ? void 0 : _a.id; }).filter(Boolean);
                if (enrolledCourseIds.length === 0) {
                    return { data: [], meta: { pagination: { page: 1, pageSize: 25, pageCount: 0, total: 0 } } };
                }
                ctx.query.filters = {
                    ...(ctx.query.filters || {}),
                    course: { id: { $in: enrolledCourseIds } }
                };
            }
        }
        return super.find(ctx);
    },
    async findOne(ctx) {
        var _a, _b;
        const user = ctx.state.user;
        if (!user)
            return ctx.unauthorized();
        const response = await super.findOne(ctx);
        if (!response || !response.data)
            return response;
        const fullUser = await strapi.db.query('plugin::users-permissions.user').findOne({
            where: { id: user.id },
            populate: ['role']
        });
        if (((_a = fullUser === null || fullUser === void 0 ? void 0 : fullUser.role) === null || _a === void 0 ? void 0 : _a.type) === 'student' || ((_b = fullUser === null || fullUser === void 0 ? void 0 : fullUser.role) === null || _b === void 0 ? void 0 : _b.type) === 'authenticated') {
            const quiz = await strapi.documents('api::quiz.quiz').findOne({
                documentId: ctx.params.id,
                populate: ['course']
            });
            if (quiz && quiz.course) {
                const enrollment = await strapi.db.query('api::enrollment.enrollment').findOne({
                    where: { student: user.id, course: quiz.course.id }
                });
                if (!enrollment) {
                    return ctx.forbidden('You are not enrolled in the course for this quiz.');
                }
            }
            else if (!quiz) {
                return ctx.notFound();
            }
        }
        return response;
    },
    async create(ctx) {
        var _a, _b, _c, _d;
        const user = ctx.state.user;
        // Check if the user is an instructor
        if (user && ((_a = user.role) === null || _a === void 0 ? void 0 : _a.type) === 'instructor') {
            const courseId = (_c = (_b = ctx.request.body) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.course;
            if (!courseId) {
                return ctx.badRequest('A course must be specified when creating a quiz');
            }
            // Verify the instructor owns this course
            const course = await strapi.documents('api::course.course').findOne({
                documentId: courseId,
                populate: ['instructor']
            });
            if (!course) {
                return ctx.badRequest('Course not found');
            }
            if (((_d = course.instructor) === null || _d === void 0 ? void 0 : _d.id) !== user.id) {
                return ctx.unauthorized('You can only create quizzes for your own courses');
            }
        }
        return super.create(ctx);
    }
}));
