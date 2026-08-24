import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::question.question', {
  config: {
    update: { policies: [{ name: 'global::is-course-owner', config: { contentType: 'api::question.question', parentField: 'quiz', ownerField: 'instructor' } }] }, // Note: parent of question is quiz, parent of quiz is course. Actually cascading doesn't work 2 levels deep out of the box in our policy. But we can just use the controller to secure question creation/update.
    delete: { policies: [{ name: 'global::is-course-owner', config: { contentType: 'api::question.question', parentField: 'quiz', ownerField: 'instructor' } }] },
  },
});