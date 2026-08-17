import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  it('no debe tener ids duplicados entre LoanForm y DebtVsInvestmentPanel (rompe la asociación label→control)', () => {
    const { container } = render(<App />);

    const ids = Array.from(container.querySelectorAll('[id]')).map((element) => element.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);

    expect(duplicates).toEqual([]);
  });
});
