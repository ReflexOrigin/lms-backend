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
    }
}));
