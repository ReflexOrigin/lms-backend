"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = async (policyContext, config, { strapi }) => {
    var _a;
    const user = policyContext.state.user;
    if (!user)
        return false;
    const userWithRole = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: user.id },
        populate: ['role'],
    });
    const roleType = (_a = userWithRole === null || userWithRole === void 0 ? void 0 : userWithRole.role) === null || _a === void 0 ? void 0 : _a.type;
    if (['admin_role', 'content_manager', 'instructor'].includes(roleType))
        return true;
    const { id } = policyContext.params;
    if (!id)
        return false;
    const courseField = config.courseField || 'course';
    const entity = await strapi.documents(config.contentType).findOne({
        documentId: id,
        populate: [courseField],
    });
    if (!entity || !entity[courseField])
        return false;
    const courseId = entity[courseField].documentId || entity[courseField].id;
    const enrollment = await strapi.db.query('api::enrollment.enrollment').findOne({
        where: {
            student: user.id,
            course: courseId,
        },
    });
    return !!enrollment;
};
