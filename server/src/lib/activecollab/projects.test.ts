import { describe, expect, it } from 'vitest';
import { filterAcProjects, parseAcProjectsResponse } from './projects.js';

describe('activecollab projects parsing', () => {
  it('parses a projects array response', () => {
    const result = parseAcProjectsResponse([
      { id: 1, name: 'Alpha', is_completed: false },
      { id: 2, name: 'Beta', is_completed: true, company_id: 9 },
    ]);

    expect(result.projects).toEqual([
      { id: 1, name: 'Alpha', isCompleted: false, companyId: null },
      { id: 2, name: 'Beta', isCompleted: true, companyId: 9 },
    ]);
  });

  it('filters projects by name or id', () => {
    const projects = [
      { id: 3040, name: 'ICR Capital AI', isCompleted: false, companyId: null },
      { id: 1376, name: 'TourPatron Product', isCompleted: false, companyId: null },
    ];

    expect(filterAcProjects(projects, 'tour')).toHaveLength(1);
    expect(filterAcProjects(projects, '3040')).toHaveLength(1);
  });
});
