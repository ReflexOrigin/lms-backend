"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const strapi_1 = require("@strapi/strapi");
exports.default = strapi_1.factories.createCoreController('api::quiz.quiz', ({ strapi }) => ({
    async find(ctx) {
        const user = ctx.state.user;
        if (user && user.role) {
            if (user.role.type === 'instructor' && ctx.query.instructorView === 'true') {
                const query = { ...ctx.query };
                delete query.instructorView;
                const quizzes = await strapi.documents('api::quiz.quiz').findMany({
                    filters: {
                        ...(query.filters || {}),
                        course: { instructor: { documentId: user.documentId } }
                    },
                    populate: query.populate,
                    status: 'draft'
                });
                const sanitized = await this.sanitizeOutput(quizzes, ctx);
                return { data: sanitized, meta: {} };
            }
        }
        return super.find(ctx);
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
            if (((_d = course.instructor) === null || _d === void 0 ? void 0 : _d.documentId) !== user.documentId) {
                return ctx.unauthorized('You can only create quizzes for your own courses');
            }
        }
        return super.create(ctx);
    }
}));
