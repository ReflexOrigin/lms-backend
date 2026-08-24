"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const strapi_1 = require("@strapi/strapi");
exports.default = strapi_1.factories.createCoreController('api::enrollment.enrollment', ({ strapi }) => ({
    async create(ctx) {
        var _a, _b, _c;
        const user = ctx.state.user;
        if ((_b = (_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.student)
            delete ctx.request.body.data.student;
        ctx.request.body.data = { ...ctx.request.body.data, enrolledAt: new Date().toISOString() };
        const response = await super.create(ctx);
        if (user && ((_c = response === null || response === void 0 ? void 0 : response.data) === null || _c === void 0 ? void 0 : _c.documentId)) {
            await strapi.documents('api::enrollment.enrollment').update({
                documentId: response.data.documentId,
                data: { student: user.documentId }
            });
        }
        return response;
    }
}));
