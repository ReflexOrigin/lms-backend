export default async (policyContext: any, config: any, { strapi }: any) => {
  const user = policyContext.state.user;
  if (!user) return false;

  const userWithRole = await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { id: user.id },
    populate: ['role'],
  });
  const roleType = userWithRole?.role?.type;

  if (roleType === 'admin_role' || roleType === 'content_manager') return true;

  const { id } = policyContext.params;
  if (!id) return false;

  const entity = await strapi.documents(config.contentType).findOne({
    documentId: id,
    populate: {
      [config.parentField]: {
        populate: [config.ownerField || 'instructor'],
      },
    },
  });

  if (!entity) return false;
  const parent = entity[config.parentField];
  if (!parent) return false;
  return parent[config.ownerField || 'instructor']?.id === user.id;
};
