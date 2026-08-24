export default async (policyContext: any, config: any, { strapi }: any) => {
  const user = policyContext.state.user;
  if (!user) return false;

  const userWithRole = await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { id: user.id },
    populate: ['role'],
  });
  const roleType = userWithRole?.role?.type;

  if (roleType === 'admin_role' || roleType === 'content_manager') {
    return true;
  }

  const { id } = policyContext.params;
  if (!id) return false;

  const contentType = config.contentType;
  const ownerField = config.ownerField || 'instructor';

  const entity = await strapi.documents(contentType).findOne({
    documentId: id,
    populate: [ownerField],
  });

  if (!entity) return false;
  return entity[ownerField]?.id === user.id;
};
