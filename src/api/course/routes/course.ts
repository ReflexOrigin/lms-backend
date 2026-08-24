import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::course.course', {
  config: {
    update: { policies: [{ name: 'global::is-owner', config: { contentType: 'api::course.course', ownerField: 'instructor' } }] },
    delete: { policies: [{ name: 'global::is-owner', config: { contentType: 'api::course.course', ownerField: 'instructor' } }] },
  },
});