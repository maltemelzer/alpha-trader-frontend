import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { DS } from '../ds';
import {
  useCompanyDevelopment,
  useFoundCompany,
  useMe,
  useMyEmployments,
  usePaySalaries,
  usePortfolio,
  usePossibleSalary,
} from '../api/queries';
import { useInternalLinks } from '../lib/useInternalLinks';
import { useMediaQuery } from '../lib/useMediaQuery';
import './CompanyPage.css';

/** Own companies (as CEO) with their development since yesterday; employments with salary; founding a new one. */
export function CompaniesPage() {
  const navigate = useNavigate();
  const onLinkClick = useInternalLinks();
  const [params, setParams] = useSearchParams();
  const me = useMe();
  const portfolio = usePortfolio();
  const development = useCompanyDevelopment();
  const found = useFoundCompany();
  const employments = useMyEmployments();
  const salary = usePossibleSalary();
  const pay = usePaySalaries();
  const due = salary.data?.value ?? 0;
  const jobs = employments.data?.content ?? [];
  const daily = jobs.reduce((s, e) => s + (e.dailyWage ?? 0), 0);
  // Narrow screens only show the employment card when there is one; the companies come first.
  const showJobs = useMediaQuery('(min-width: 1100px)') || jobs.length > 0 || due > 0;
  const founding = params.get('gruenden') === '1';
  const [error, setError] = useState<string | null>(null);
  const list = development.data?.content ?? [];

  const openFounding = (open: boolean) => setParams(open ? { gruenden: '1' } : {}, { replace: true });

  return (
    <div className="page" onClick={onLinkClick}>
      <DS.PageHeader
        size="md"
        title="Meine Unternehmen"
        meta={<span>{list.length === 1 ? '1 Unternehmen als CEO' : `${list.length} Unternehmen als CEO`}</span>}
        actions={
          <DS.Button variant="primary" size="sm" onClick={() => openFounding(true)}>
            Unternehmen gründen
          </DS.Button>
        }
      />
      <div className="page__body companies__body">
        <DS.Card fill flush title="Entwicklung seit gestern">
          {development.isLoading ? (
            <DS.Loading rows={4} />
          ) : (
            <DS.CompanyDevelopment
              companies={list}
              hrefFor={(c) => `/unternehmen/${c.securityIdentifier}`}
              onFound={() => openFounding(true)}
              empty={
                <DS.EmptyState
                  title="Noch kein Unternehmen"
                  action={<DS.Button onClick={() => openFounding(true)}>Unternehmen gründen</DS.Button>}
                >
                  Als CEO führst du ein Unternehmen, gibst Anleihen aus und beantragst Kapitalmaßnahmen.
                </DS.EmptyState>
              }
            />
          )}
        </DS.Card>
        {showJobs && (
          <DS.Card fill title="Anstellungen" className="companies__jobs">
            <DS.StatGroup columns="1fr 1fr">
              <DS.StatTile label="Gehalt je Tag" value={daily} compact="auto" />
              <DS.StatTile label="Abholbereit" value={due} compact="auto" />
            </DS.StatGroup>
            <DS.Button variant="secondary" size="sm" disabled={!due} loading={pay.isPending} onClick={() => pay.mutate()}>
              Gehalt abholen
            </DS.Button>
            {pay.isError && <DS.Banner variant="error">Nicht abgeholt: {pay.error.message}</DS.Banner>}
            <div className="companies__joblist">
              {employments.isLoading ? (
                <DS.Loading rows={3} />
              ) : !jobs.length ? (
                <DS.EmptyState compact as="h4" title="Keine Anstellung">
                  Als CEO erhältst du ein Tagesgehalt vom Unternehmen.
                </DS.EmptyState>
              ) : (
                <DS.EmploymentList
                  employments={jobs}
                  density="sm"
                  hrefFor={(e) =>
                    e.company.securityIdentifier ? `/unternehmen/${e.company.securityIdentifier}` : '/unternehmen'
                  }
                />
              )}
            </div>
          </DS.Card>
        )}
      </div>
      <DS.Sheet
        open={founding}
        onClose={() => !found.isPending && openFounding(false)}
        title="Unternehmen gründen"
        side="auto"
        width={520}
      >
        <DS.CompanyFoundingForm
          heading={false}
          cash={portfolio.data?.cash}
          premium={!!me.data?.userCapabilities?.premium}
          loading={found.isPending}
          onCancel={() => openFounding(false)}
          onSubmit={(q) =>
            found.mutate(q, {
              onSuccess: (c) => navigate(c.securityIdentifier ? `/unternehmen/${c.securityIdentifier}` : '/unternehmen'),
              onError: (e) => setError(e.message),
            })
          }
        />
        {error && <DS.Banner variant="error">Gründung fehlgeschlagen: {error}</DS.Banner>}
      </DS.Sheet>
    </div>
  );
}
