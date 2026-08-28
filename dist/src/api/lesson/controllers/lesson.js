"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const strapi_1 = require("@strapi/strapi");
exports.default = strapi_1.factories.createCoreController('api::lesson.lesson', ({ strapi }) => ({
    async find(ctx) {
        const user = ctx.state.user;
        if (user && user.role) {
            if ((user.role.type === 'instructor' || user.role.type === 'content_manager' || user.role.type === 'admin_role') && ctx.query.managerView === 'true') {
                const query = { ...ctx.query };
                delete query.managerView;
                const filters = {
                    ...(query.filters || {})
                };
                // Instructors can only see lessons for their own courses
                if (user.role.type === 'instructor') {
                    filters.course = { instructor: { documentId: user.documentId } };
                }
                const draftLessons = await strapi.documents('api::lesson.lesson').findMany({
                    filters,
                    populate: query.populate,
                    status: 'draft'
                });
                const pubLessons = await strapi.documents('api::lesson.lesson').findMany({
                    filters,
                    status: 'published'
                });
                const pubMap = new Map(pubLessons.map((l) => [l.documentId, l.publishedAt]));
                for (const l of draftLessons) {
                    if (pubMap.has(l.documentId)) {
                        l.publishedAt = pubMap.get(l.documentId);
                    }
                }
                const lessons = draftLessons;
                const sanitized = await this.sanitizeOutput(lessons, ctx);
                return { data: sanitized, meta: {} };
            }
        }
        return super.find(ctx);
    },
    async create(ctx) {
        var _a, _b, _c, _d, _e, _f;
        const user = ctx.state.user;
        const courseId = (_b = (_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.course;
        if (((_c = user === null || user === void 0 ? void 0 : user.role) === null || _c === void 0 ? void 0 : _c.type) === 'instructor') {
            if (!courseId)
                return ctx.badRequest('Course is required');
            const course = await strapi.documents('api::course.course').findOne({
                documentId: courseId,
                populate: ['instructor']
            });
            if (!course || ((_d = course.instructor) === null || _d === void 0 ? void 0 : _d.id) !== user.id) {
                return ctx.forbidden('You can only add lessons to your own courses.');
            }
        }
        if (courseId) {
            const requestedOrder = (_f = (_e = ctx.request.body) === null || _e === void 0 ? void 0 : _e.data) === null || _f === void 0 ? void 0 : _f.order;
            const courseEntity = await strapi.db.query('api::course.course').findOne({
                where: { documentId: courseId },
                select: ['id']
            });
            if (courseEntity) {
                const existingLessons = await strapi.db.query('api::lesson.lesson').findMany({
                    where: { course: courseEntity.id },
                    select: ['order']
                });
                const takenOrders = new Set(existingLessons.map(l => l.order));
                if (requestedOrder === undefined || requestedOrder === null || takenOrders.has(Number(requestedOrder))) {
                    let nextOrder = 0;
                    if (existingLessons.length > 0) {
                        nextOrder = Math.max(...existingLessons.map(l => l.order || 0)) + 1;
                    }
                    if (!ctx.request.body.data)
                        ctx.request.body.data = {};
                    ctx.request.body.data.order = nextOrder;
                }
            }
        }
        return super.create(ctx);
    },
    async update(ctx) {
        var _a, _b;
        const requestedOrder = (_b = (_a = ctx.request.body) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.order;
        const documentId = ctx.params.id; // Strapi v5 uses documentId in route params
        if (requestedOrder !== undefined && requestedOrder !== null) {
            const currentLesson = await strapi.db.query('api::lesson.lesson').findOne({
                where: { documentId },
                populate: ['course']
            });
            if (currentLesson && currentLesson.course) {
                const existingLessons = await strapi.db.query('api::lesson.lesson').findMany({
                    where: {
                        course: currentLesson.course.id,
                        id: { $ne: currentLesson.id }
                    },
                    select: ['order']
                });
                const takenOrders = new Set(existingLessons.map(l => l.order));
                if (takenOrders.has(Number(requestedOrder))) {
                    let nextOrder = 0;
                    if (existingLessons.length > 0) {
                        nextOrder = Math.max(...existingLessons.map(l => l.order || 0)) + 1;
                    }
                    ctx.request.body.data.order = nextOrder;
                }
            }
        }
        return super.update(ctx);
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
