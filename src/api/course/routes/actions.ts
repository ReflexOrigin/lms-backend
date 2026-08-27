export default {
  routes: [
    {
      method: 'POST',
      path: '/courses/:documentId/publish',
      handler: 'course.publishCourse',
      config: {
        policies: [{ name: 'global::is-owner', config: { contentType: 'api::course.course', ownerField: 'instructor' } }]
      }
    },
    {
      method: 'POST',
      path: '/courses/:documentId/unpublish',
      handler: 'course.unpublishCourse',
      config: {
        policies: [{ name: 'global::is-owner', config: { contentType: 'api::course.course', ownerField: 'instructor' } }]
      }
    }
  ]
};
