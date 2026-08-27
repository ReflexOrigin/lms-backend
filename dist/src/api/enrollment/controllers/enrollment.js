"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const strapi_1 = require("@strapi/strapi");
exports.default = strapi_1.factories.createCoreController('api::enrollment.enrollment', ({ strapi }) => ({
    async create(ctx) {
        var _a, _b, _c;
        const user = ctx.state.user;
        if ((_b = (_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.student)
            delete ctx.request.body.data.student;
        ctx.request.body.data = {
            ...ctx.request.body.data,
            enrolledAt: new Date().toISOString()
        };
        const response = await super.create(ctx);
        if (user && ((_c = response === null || response === void 0 ? void 0 : response.data) === null || _c === void 0 ? void 0 : _c.documentId)) {
            await strapi.db.query('api::enrollment.enrollment').update({
                where: { documentId: response.data.documentId },
                data: { student: user.id }
            });
        }
        return response;
    },
    async find(ctx) {
        var _a;
        const user = ctx.state.user;
        if (!user)
            return ctx.unauthorized();
        const fullUser = await strapi.db.query('plugin::users-permissions.user').findOne({
            where: { id: user.id },
            populate: ['role']
        });
        if (((_a = fullUser === null || fullUser === void 0 ? void 0 : fullUser.role) === null || _a === void 0 ? void 0 : _a.type) === 'authenticated') {
            ctx.query.filters = {
                ...(ctx.query.filters || {}),
                student: user.id,
            };
        }
        return super.find(ctx);
    },
    async findOne(ctx) {
        var _a;
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
        if (((_a = fullUser === null || fullUser === void 0 ? void 0 : fullUser.role) === null || _a === void 0 ? void 0 : _a.type) === 'authenticated') {
            const dbEntity = await strapi.db.query('api::enrollment.enrollment').findOne({
                where: { documentId: ctx.params.id },
                populate: ['student']
            });
            if (!dbEntity || !dbEntity.student || dbEntity.student.id !== user.id) {
                return ctx.forbidden('You are not authorized to view this enrollment.');
            }
        }
        return response;
    }
}));
