"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const strapi_1 = require("@strapi/strapi");
exports.default = strapi_1.factories.createCoreController('api::course.course', ({ strapi }) => ({
    async find(ctx) {
        const user = ctx.state.user;
        if (user && user.role) {
            if (user.role.type === 'instructor') {
                const courses = await strapi.documents('api::course.course').findMany({
                    filters: { instructor: { documentId: user.documentId } },
                    populate: ctx.query.populate
                });
                return { data: courses, meta: {} };
            }
        }
        return super.find(ctx);
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
