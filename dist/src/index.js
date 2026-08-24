"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    /**
     * An asynchronous register function that runs before
     * your application is initialized.
     *
     * This gives you an opportunity to extend code.
     */
    register({ strapi }) { },
    /**
     * An asynchronous bootstrap function that runs before
     * your application gets started.
     *
     * This gives you an opportunity to set up your data model,
     * run jobs, or perform some special logic.
     */
    async bootstrap({ strapi }) {
        // Enable Public permissions for TestPost
        const roleService = strapi.db.query('plugin::users-permissions.role');
        const publicRole = await roleService.findOne({ where: { type: 'public' } });
        if (publicRole) {
            const permissionService = strapi.db.query('plugin::users-permissions.permission');
            const actions = ['api::test-post.test-post.find', 'api::test-post.test-post.findOne'];
            for (const action of actions) {
                const existing = await permissionService.findOne({ where: { role: publicRole.id, action } });
                if (!existing) {
                    await permissionService.create({
                        data: { role: publicRole.id, action, enabled: true },
                    });
                    strapi.log.info(`Enabled public permission: ${action}`);
                }
            }
        }
        // Seed a test post
        const testPostService = strapi.db.query('api::test-post.test-post');
        const existingPost = await testPostService.findOne({ where: { title: 'Hello LMS' } });
        if (!existingPost) {
            await testPostService.create({
                data: { title: 'Hello LMS', body: 'This is a test post to verify the connection.' },
                populate: true, // Strapi v5 requires explicit populate or it might not return everything in some contexts
            });
            strapi.log.info('Created test post');
        }
    },
};
