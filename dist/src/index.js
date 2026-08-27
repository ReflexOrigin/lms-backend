"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    /**
     * An asynchronous register function that runs before
     * your application is initialized.
     */
    register({ strapi }) {
        const extensionService = strapi.plugin('users-permissions').controller('auth');
        const originalRegister = extensionService.register;
        extensionService.register = async (ctx, next) => {
            var _a, _b;
            const requestedRole = ctx.request.query.requestedRole || 'authenticated';
            const ALLOWED_ROLES = ['authenticated', 'instructor'];
            if (!ALLOWED_ROLES.includes(requestedRole)) {
                return ctx.badRequest('Invalid role requested');
            }
            await originalRegister(ctx, next);
            if (ctx.response.status === 200 && requestedRole !== 'authenticated') {
                const roleService = strapi.db.query('plugin::users-permissions.role');
                const role = await roleService.findOne({ where: { type: requestedRole } });
                if (role && ((_b = (_a = ctx.response.body) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.id)) {
                    await strapi.db.query('plugin::users-permissions.user').update({
                        where: { id: ctx.response.body.user.id },
                        data: { role: role.id }
                    });
                }
            }
        };
    },
    /**
     * An asynchronous bootstrap function that runs before
     * your application gets started.
     */
    async bootstrap({ strapi }) {
        // ── Step 1: Seed custom roles ──
        const roleQuery = strapi.db.query('plugin::users-permissions.role');
        const rolesToSeed = [
            { name: 'Admin', description: 'Full platform control — manages users, roles, and all content', type: 'admin_role' },
            { name: 'Content Manager', description: 'Creates and manages all courses, lessons, and blog posts', type: 'content_manager' },
            { name: 'Instructor', description: 'Manages own courses, lessons, quizzes; views own students progress', type: 'instructor' },
        ];
        for (const role of rolesToSeed) {
            const existing = await roleQuery.findOne({ where: { type: role.type } });
            if (!existing) {
                await roleQuery.create({ data: role });
                strapi.log.info(`✅ Created role: ${role.name} (type: ${role.type})`);
            }
        }
        // ── Step 2: Set permissions ──
        await setAllPermissions(strapi);
        strapi.log.info('✅ All role permissions configured');
        // ── Step 3: Seed a default frontend Admin User ──
        const userQuery = strapi.db.query('plugin::users-permissions.user');
        const adminRole = await roleQuery.findOne({ where: { type: 'admin_role' } });
        if (adminRole) {
            const adminExists = await userQuery.findOne({ where: { email: 'admin@lms.com' } });
            if (!adminExists) {
                // Use the users-permissions user service which automatically hashes the password
                await strapi.plugin('users-permissions').service('user').add({
                    username: 'SuperAdmin',
                    email: 'admin@lms.com',
                    password: 'AdminPassword123!',
                    provider: 'local',
                    confirmed: true,
                    blocked: false,
                    role: adminRole.id,
                });
                strapi.log.info('✅ Created default frontend Admin (admin@lms.com / AdminPassword123!)');
            }
            else {
                // Force update the provider and reset password just in case it was created incorrectly
                const authService = strapi.plugin('users-permissions').service('user');
                await strapi.plugin('users-permissions').service('user').edit(adminExists.id, {
                    password: 'AdminPassword123!',
                    provider: 'local',
                    confirmed: true,
                    blocked: false,
                });
                strapi.log.info('✅ Reset default frontend Admin (admin@lms.com / AdminPassword123!)');
            }
        }
    },
};
const PERMISSION_MAP = {
    public: {
        'api::course.course': ['find', 'findOne'],
        'api::category.category': ['find', 'findOne'],
        'api::blog-post.blog-post': ['find', 'findOne'],
    },
    authenticated: {
        'api::course.course': ['find', 'findOne'],
        'api::category.category': ['find', 'findOne'],
        'api::lesson.lesson': ['find', 'findOne'],
        'api::quiz.quiz': ['find', 'findOne'],
        'api::question.question': ['find', 'findOne'],
        'api::enrollment.enrollment': ['find', 'findOne', 'create'],
        'api::progress.progress': ['find', 'findOne', 'create', 'update'],
        'api::blog-post.blog-post': ['find', 'findOne'],
        'api::quiz-attempt.quiz-attempt': ['find', 'findOne', 'create'],
    },
    instructor: {
        'api::course.course': ['find', 'findOne', 'create', 'update', 'delete', 'publishCourse', 'unpublishCourse'],
        'api::category.category': ['find', 'findOne'],
        'api::lesson.lesson': ['find', 'findOne', 'create', 'update', 'delete', 'publishLesson', 'unpublishLesson'],
        'api::quiz.quiz': ['find', 'findOne', 'create', 'update', 'delete'],
        'api::question.question': ['find', 'findOne', 'create', 'update', 'delete'],
        'api::enrollment.enrollment': ['find', 'findOne'],
        'api::progress.progress': ['find', 'findOne'],
        'api::blog-post.blog-post': ['find', 'findOne'],
        'api::quiz-attempt.quiz-attempt': ['find', 'findOne'],
    },
    content_manager: {
        'api::course.course': ['find', 'findOne', 'create', 'update', 'delete', 'publishCourse', 'unpublishCourse'],
        'api::category.category': ['find', 'findOne'],
        'api::lesson.lesson': ['find', 'findOne', 'create', 'update', 'delete', 'publishLesson', 'unpublishLesson'],
        'api::quiz.quiz': ['find', 'findOne', 'create', 'update', 'delete'],
        'api::question.question': ['find', 'findOne', 'create', 'update', 'delete'],
        'api::enrollment.enrollment': ['find', 'findOne'],
        'api::progress.progress': ['find', 'findOne'],
        'api::blog-post.blog-post': ['find', 'findOne', 'create', 'update', 'delete'],
        'api::quiz-attempt.quiz-attempt': ['find', 'findOne'],
    },
    admin_role: {
        'api::course.course': ['find', 'findOne', 'create', 'update', 'delete', 'publishCourse', 'unpublishCourse'],
        'api::category.category': ['find', 'findOne', 'create', 'update', 'delete'],
        'api::lesson.lesson': ['find', 'findOne', 'create', 'update', 'delete', 'publishLesson', 'unpublishLesson'],
        'api::quiz.quiz': ['find', 'findOne', 'create', 'update', 'delete'],
        'api::question.question': ['find', 'findOne', 'create', 'update', 'delete'],
        'api::enrollment.enrollment': ['find', 'findOne', 'delete'],
        'api::progress.progress': ['find', 'findOne'],
        'api::blog-post.blog-post': ['find', 'findOne', 'create', 'update', 'delete'],
        'api::quiz-attempt.quiz-attempt': ['find', 'findOne', 'delete'],
        'api::admin-custom.admin-custom': ['getStats', 'getUsers', 'updateUserRole', 'deleteUser'],
    },
};
const PLUGIN_PERMISSION_MAP = {
    public: {
        'plugin::users-permissions.auth': ['callback', 'register'],
        'plugin::users-permissions.user': ['find', 'findOne'],
    },
    authenticated: {
        'plugin::users-permissions.auth': ['callback'],
        'plugin::users-permissions.user': ['me', 'find', 'findOne'],
    },
    instructor: {
        'plugin::users-permissions.auth': ['callback'],
        'plugin::users-permissions.user': ['me', 'find', 'findOne'],
    },
    content_manager: {
        'plugin::users-permissions.auth': ['callback'],
        'plugin::users-permissions.user': ['me'],
    },
    admin_role: {
        'plugin::users-permissions.auth': ['callback'],
        'plugin::users-permissions.user': ['me', 'find', 'findOne', 'update', 'destroy'],
        'plugin::users-permissions.role': ['find'],
    },
};
async function setAllPermissions(strapi) {
    const permQuery = strapi.db.query('plugin::users-permissions.permission');
    const roleQuery = strapi.db.query('plugin::users-permissions.role');
    for (const [roleType, contentTypes] of Object.entries(PERMISSION_MAP)) {
        const role = await roleQuery.findOne({ where: { type: roleType } });
        if (!role)
            continue;
        for (const [contentType, actions] of Object.entries(contentTypes)) {
            for (const action of actions) {
                const actionString = `${contentType}.${action}`;
                const existing = await permQuery.findOne({
                    where: { action: actionString, role: role.id },
                });
                if (!existing) {
                    await permQuery.create({
                        data: { action: actionString, role: role.id, enabled: true },
                    });
                }
            }
        }
    }
    for (const [roleType, plugins] of Object.entries(PLUGIN_PERMISSION_MAP)) {
        const role = await roleQuery.findOne({ where: { type: roleType } });
        if (!role)
            continue;
        for (const [pluginAction, actions] of Object.entries(plugins)) {
            for (const action of actions) {
                const actionString = `${pluginAction}.${action}`;
                const existing = await permQuery.findOne({
                    where: { action: actionString, role: role.id },
                });
                if (!existing) {
                    await permQuery.create({
                        data: { action: actionString, role: role.id, enabled: true },
                    });
                }
            }
        }
    }
}
