import { Navigate, useLocation, useParams } from 'react-router';
import { companyRedirect } from './views';

/** /unternehmen/:asin – the company lives on its stock's page now (views.ts); every parameter is kept. */
export function CompanyRedirect() {
  const { asin = '' } = useParams();
  const { search } = useLocation();
  return <Navigate to={companyRedirect(asin, search)} replace />;
}
