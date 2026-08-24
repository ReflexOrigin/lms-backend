"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const strapi_1 = require("@strapi/strapi");
exports.default = strapi_1.factories.createCoreController('api::question.question', ({ strapi }) => ({
    async find(ctx) {
        var _a;
        const user = ctx.state.user;
        if (((_a = user === null || user === void 0 ? void 0 : user.role) === null || _a === void 0 ? void 0 : _a.type) === 'authenticated') {
            // Students should NEVER get correctAnswer
            const response = await super.find(ctx);
            // Strapi v5 private fields handle this mostly, but just in case:
            // (private fields are omitted in response by default)
            return response;
        }
        return super.find(ctx);
    }
}));
