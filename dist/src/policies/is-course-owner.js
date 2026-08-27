"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = async (policyContext, config, { strapi }) => {
    var _a, _b;
    const user = policyContext.state.user;
    if (!user)
        return false;
    const userWithRole = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: user.id },
        populate: ['role'],
    });
    const roleType = (_a = userWithRole === null || userWithRole === void 0 ? void 0 : userWithRole.role) === null || _a === void 0 ? void 0 : _a.type;
    if (roleType === 'admin_role' || roleType === 'content_manager')
        return true;
    const id = policyContext.params.id || policyContext.params.documentId;
    if (!id)
        return false;
    const entity = await strapi.documents(config.contentType).findOne({
        documentId: id,
        populate: {
            [config.parentField]: {
                populate: [config.ownerField || 'instructor'],
            },
        },
    });
    if (!entity)
        return false;
    const parent = entity[config.parentField];
    if (!parent)
        return false;
    return ((_b = parent[config.ownerField || 'instructor']) === null || _b === void 0 ? void 0 : _b.id) === user.id;
};
