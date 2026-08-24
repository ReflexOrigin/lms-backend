import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::quiz.quiz', {
  config: {
    findOne: { policies: [{ name: 'global::is-enrolled', config: { contentType: 'api::quiz.quiz', courseField: 'course' } }] },
    update: { policies: [{ name: 'global::is-course-owner', config: { contentType: 'api::quiz.quiz', parentField: 'course', ownerField: 'instructor' } }] },
    delete: { policies: [{ name: 'global::is-course-owner', config: { contentType: 'api::quiz.quiz', parentField: 'course', ownerField: 'instructor' } }] },
  },
});