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
    return ((_a = userWithRole === null || userWithRole === void 0 ? void 0 : userWithRole.role) === null || _a === void 0 ? void 0 : _a.type) === 'authenticated';
};
