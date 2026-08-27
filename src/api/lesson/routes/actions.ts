export default {
  routes: [
    {
      method: 'POST',
      path: '/lessons/:documentId/publish',
      handler: 'lesson.publishLesson',
      config: {
        policies: [{ name: 'global::is-course-owner', config: { contentType: 'api::lesson.lesson', parentField: 'course', ownerField: 'instructor' } }]
      }
    },
    {
      method: 'POST',
      path: '/lessons/:documentId/unpublish',
      handler: 'lesson.unpublishLesson',
      config: {
        policies: [{ name: 'global::is-course-owner', config: { contentType: 'api::lesson.lesson', parentField: 'course', ownerField: 'instructor' } }]
      }
    }
  ]
};
