import { render, screen } from '@testing-library/react';
import { DS, format } from './ds';

describe('design system bundle', () => {
  it('registers components on window.Bankiersgruen', () => {
    expect(typeof DS.Button).toBe('object'); // forwardRef
    expect(typeof format.money).toBe('function');
  });

  it('renders a component with the app React instance', () => {
    render(<DS.Button variant="primary">Kaufen</DS.Button>);
    expect(screen.getByRole('button', { name: 'Kaufen' })).toBeInTheDocument();
  });
});
