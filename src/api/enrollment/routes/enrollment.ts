import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::enrollment.enrollment', {
  config: {
    create: { policies: ['global::is-student-only'] },
  },
});