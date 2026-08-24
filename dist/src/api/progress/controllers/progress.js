"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const strapi_1 = require("@strapi/strapi");
exports.default = strapi_1.factories.createCoreController('api::progress.progress', ({ strapi }) => ({
    async create(ctx) {
        var _a, _b, _c;
        const user = ctx.state.user;
        if ((_b = (_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.student)
            delete ctx.request.body.data.student;
        const response = await super.create(ctx);
        if (user && ((_c = response === null || response === void 0 ? void 0 : response.data) === null || _c === void 0 ? void 0 : _c.documentId)) {
            await strapi.documents('api::progress.progress').update({
                documentId: response.data.documentId,
                data: { student: user.documentId }
            });
        }
        return response;
    },
    async update(ctx) {
        var _a, _b, _c;
        const user = ctx.state.user;
        const { id } = ctx.params;
        const progress = await strapi.documents('api::progress.progress').findOne({ documentId: id, populate: ['student'] });
        if (!progress || ((_a = progress.student) === null || _a === void 0 ? void 0 : _a.documentId) !== user.documentId) {
            return ctx.forbidden('Not your progress');
        }
        if ((_c = (_b = ctx.request.body) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.student)
            delete ctx.request.body.data.student;
        return super.update(ctx); // student is already attached anyway
    }
}));
