"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const strapi_1 = require("@strapi/strapi");
exports.default = strapi_1.factories.createCoreController('api::course.course', ({ strapi }) => ({
    async find(ctx) {
        const user = ctx.state.user;
        console.log('GET /courses query:', JSON.stringify(ctx.query));
        if (user && user.role) {
            if (user.role.type === 'instructor' && ctx.query.instructorView === 'true') {
                const query = { ...ctx.query };
                delete query.instructorView;
                // Use document service to bypass REST API draft permissions for instructors
                const filters = {
                    ...(query.filters || {}),
                    instructor: { documentId: user.documentId }
                };
                console.log('Instructor course findMany filters:', JSON.stringify(filters, null, 2));
                const courses = await strapi.documents('api::course.course').findMany({
                    filters,
                    populate: query.populate,
                    status: 'draft'
                });
                console.log('Found courses count:', courses.length);
                const sanitized = await this.sanitizeOutput(courses, ctx);
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
