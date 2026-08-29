export default {
  routes: [
    {
      method: 'POST',
      path: '/blog-posts/:documentId/publish',
      handler: 'blog-post.publishBlogPost',
      config: {
        policies: [{ name: 'global::is-owner', config: { contentType: 'api::blog-post.blog-post', ownerField: 'author' } }]
      }
    },
    {
      method: 'POST',
      path: '/blog-posts/:documentId/unpublish',
      handler: 'blog-post.unpublishBlogPost',
      config: {
        policies: [{ name: 'global::is-owner', config: { contentType: 'api::blog-post.blog-post', ownerField: 'author' } }]
      }
    }
  ]
};
