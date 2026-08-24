"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const strapi_1 = require("@strapi/strapi");
exports.default = strapi_1.factories.createCoreController('api::blog-post.blog-post', ({ strapi }) => ({
    async find(ctx) {
        var _a;
        const user = ctx.state.user;
        if (((_a = user === null || user === void 0 ? void 0 : user.role) === null || _a === void 0 ? void 0 : _a.type) === 'content_manager') {
            const posts = await strapi.documents('api::blog-post.blog-post').findMany({
                filters: {
                    $or: [
                        { publishedAt: { $notNull: true } },
                        { author: { documentId: user.documentId } }
                    ]
                },
                populate: ctx.query.populate
            });
            return { data: posts, meta: {} };
        }
        return super.find(ctx);
    },
    async create(ctx) {
        var _a, _b, _c;
        const user = ctx.state.user;
        if ((_b = (_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.author)
            delete ctx.request.body.data.author;
        const response = await super.create(ctx);
        if (user && ((_c = response === null || response === void 0 ? void 0 : response.data) === null || _c === void 0 ? void 0 : _c.documentId)) {
            await strapi.documents('api::blog-post.blog-post').update({
                documentId: response.data.documentId,
                data: { author: user.documentId }
            });
        }
        return response;
    }
}));
