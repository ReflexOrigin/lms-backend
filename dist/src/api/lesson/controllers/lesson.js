"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const strapi_1 = require("@strapi/strapi");
exports.default = strapi_1.factories.createCoreController('api::lesson.lesson', ({ strapi }) => ({
    async find(ctx) {
        const user = ctx.state.user;
        if (user && user.role) {
            if (user.role.type === 'instructor' && ctx.query.instructorView === 'true') {
                const query = { ...ctx.query };
                delete query.instructorView;
                const lessons = await strapi.documents('api::lesson.lesson').findMany({
                    filters: {
                        ...(query.filters || {}),
                        course: { instructor: { documentId: user.documentId } }
                    },
                    populate: query.populate,
                    status: 'draft'
                });
                const sanitized = await this.sanitizeOutput(lessons, ctx);
                return { data: sanitized, meta: {} };
            }
        }
        return super.find(ctx);
    },
    async create(ctx) {
        var _a, _b, _c, _d;
        const user = ctx.state.user;
        const courseId = (_b = (_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.course;
        if (((_c = user === null || user === void 0 ? void 0 : user.role) === null || _c === void 0 ? void 0 : _c.type) === 'instructor') {
            if (!courseId)
                return ctx.badRequest('Course is required');
            const course = await strapi.documents('api::course.course').findOne({
                documentId: courseId,
                populate: ['instructor']
            });
            if (!course || ((_d = course.instructor) === null || _d === void 0 ? void 0 : _d.documentId) !== user.documentId) {
                return ctx.forbidden('You can only add lessons to your own courses.');
            }
        }
        return super.create(ctx);
    },
    async publishLesson(ctx) {
        const { documentId } = ctx.params;
        const published = await strapi.documents('api::lesson.lesson').publish({ documentId });
        return { data: published };
    },
    async unpublishLesson(ctx) {
        const { documentId } = ctx.params;
        const unpublished = await strapi.documents('api::lesson.lesson').unpublish({ documentId });
        return { data: unpublished };
    }
}));
