import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::blog-post.blog-post', ({ strapi }) => ({
  async find(ctx: any) {
    const user = ctx.state.user;
    if (user?.role?.type === 'content_manager') {
      const posts = await strapi.documents('api::blog-post.blog-post').findMany({
        filters: {
          $or: [
            { publishedAt: { $notNull: true } },
            { author: { documentId: user.documentId } }
          ]
        },
        populate: ctx.query.populate as any
      });
      return { data: posts, meta: {} };
    }
    return super.find(ctx);
  },
  async create(ctx: any) {
    const user = ctx.state.user;
    if (ctx.request.body?.data?.author) delete ctx.request.body.data.author;
    const response = await super.create(ctx);
    if (user && response?.data?.documentId) {
      await strapi.documents('api::blog-post.blog-post').update({
        documentId: response.data.documentId,
        data: { author: user.documentId }
      });
    }
    return response;
  },
  async publishBlogPost(ctx: any) {
    const { documentId } = ctx.params;
    const published = await strapi.documents('api::blog-post.blog-post').publish({ documentId });
    return { data: published };
  },
  async unpublishBlogPost(ctx: any) {
    const { documentId } = ctx.params;
    const unpublished = await strapi.documents('api::blog-post.blog-post').unpublish({ documentId });
    return { data: unpublished };
  }
}));