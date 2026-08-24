import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::lesson.lesson', {
  config: {
    findOne: { policies: [{ name: 'global::is-enrolled', config: { contentType: 'api::lesson.lesson', courseField: 'course' } }] },
    update: { policies: [{ name: 'global::is-course-owner', config: { contentType: 'api::lesson.lesson', parentField: 'course', ownerField: 'instructor' } }] },
    delete: { policies: [{ name: 'global::is-course-owner', config: { contentType: 'api::lesson.lesson', parentField: 'course', ownerField: 'instructor' } }] },
  },
});