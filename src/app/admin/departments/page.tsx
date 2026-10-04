import { Badge, Card, CardHeader } from '@/components/ui';
import { DEPARTMENTS } from '@/content/departments';

export default function AdminDepartmentsPage() {
  return (
    <Card>
      <CardHeader
        title="Departments"
        subtitle="Five departments, one company. Each performs different work."
      />
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              {['Slug', 'Name', 'Project', 'Product', 'Scenario', 'Status'].map((h) => (
                <th
                  key={h}
                  className="border-b border-line px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DEPARTMENTS.map((department) => (
              <tr key={department.slug}>
                <td className="border-b border-line px-4 py-2.5 font-mono text-body">
                  {department.slug}
                </td>
                <td className="border-b border-line px-4 py-2.5 text-strong">
                  {department.name}
                </td>
                <td className="border-b border-line px-4 py-2.5 text-body">
                  {department.projectTitle}
                </td>
                <td className="border-b border-line px-4 py-2.5">
                  {department.productKey ? (
                    <span className="font-mono text-body">{department.productKey}</span>
                  ) : (
                    <Badge tone="warn" title="projects.product_id is NULL for this project">
                      null
                    </Badge>
                  )}
                </td>
                <td className="border-b border-line px-4 py-2.5 font-mono text-body">
                  {department.scenarioKey ?? '—'}
                </td>
                <td className="border-b border-line px-4 py-2.5">
                  <Badge tone={department.status === 'playable' ? 'success' : 'muted'}>
                    {department.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-line px-5 py-3 text-[11px] text-muted">
        A <code className="text-accent-400">null</code> product is correct, not missing
        data: Product Management starts from a customer problem and Strategy has no
        assigned product. <code className="text-accent-400">projects.product_id</code> is
        nullable for exactly this reason.
      </p>
    </Card>
  );
}
