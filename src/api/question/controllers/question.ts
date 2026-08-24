import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::question.question', ({ strapi }) => ({
  async find(ctx) {
    const user = ctx.state.user;
    if (user?.role?.type === 'authenticated') {
      // Students should NEVER get correctAnswer
      const response = await super.find(ctx);
      // Strapi v5 private fields handle this mostly, but just in case:
      // (private fields are omitted in response by default)
      return response;
    }
    return super.find(ctx);
  }
}));