module.exports = {
  sidebar: [
    {
      type: 'doc',
      id: 'overview/index',
      label: 'Overview',
    },
    {
      type: 'category',
      label: 'Quickstart',
      items: [
        'quickstart/demo',
        'quickstart/connect-second-cluster',
      ],
    },
    {
      type: 'category',
      label: 'Concepts',
      items: [
        'concepts/architecture',
      ],
    },
    {
      type: 'category',
      label: 'Features',
      items: [
        {
          type: 'category',
          label: 'Catalog',
          link: { type: 'doc', id: 'features/catalog/overview' },
          customProps: { badge: 'Preview' },
          items: [
            'features/catalog/configuration',
            'features/catalog/external-registry',
            'features/catalog/reference',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Deploy',
      items: [
        'howtos/prerequisites',
        'howtos/oidc-configuration',
        {
          type: 'category',
          label: 'Databases',
          link: { type: 'doc', id: 'howtos/databases/overview' },
          items: [
            'howtos/databases/aws-rds',
          ],
        },
        'howtos/install',
      ],
    },
    {
      type: 'category',
      label: 'Production',
      link: { type: 'doc', id: 'howtos/production-overview' },
      items: [
        'howtos/sizing',
        'howtos/high-availability',
        'howtos/autoscaling',
        'howtos/rbac',
        'howtos/upgrades',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      link: { type: 'doc', id: 'reference/index' },
      items: [
        'reference/feature-flags',
        'reference/feature-releases',
      ],
    },
  ],
};
