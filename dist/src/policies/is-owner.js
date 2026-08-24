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
    if (roleType === 'admin_role' || roleType === 'content_manager') {
        return true;
    }
    const { id } = policyContext.params;
    if (!id)
        return false;
    const contentType = config.contentType;
    const ownerField = config.ownerField || 'instructor';
    const entity = await strapi.documents(contentType).findOne({
        documentId: id,
        populate: [ownerField],
    });
    if (!entity)
        return false;
    return ((_b = entity[ownerField]) === null || _b === void 0 ? void 0 : _b.id) === user.id;
};
