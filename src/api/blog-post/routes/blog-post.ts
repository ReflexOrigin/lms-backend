import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::blog-post.blog-post', {
  config: {
    update: { policies: [{ name: 'global::is-owner', config: { contentType: 'api::blog-post.blog-post', ownerField: 'author' } }] },
    delete: { policies: [{ name: 'global::is-owner', config: { contentType: 'api::blog-post.blog-post', ownerField: 'author' } }] },
  },
});