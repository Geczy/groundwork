import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderRoute } from '@/test/render';

describe('/', () => {
  it('presents the project as a production-ready React foundation', async () => {
    renderRoute('/');

    expect(
      await screen.findByRole('heading', {
        name: 'A serious starting point for the app you actually want to build.',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '15 anti-slop rules' })).toBeInTheDocument();
  });

  it('does not ship a pretend product feature', async () => {
    renderRoute('/');

    await screen.findByRole('heading', {
      name: 'A serious starting point for the app you actually want to build.',
    });
    expect(screen.queryByRole('link', { name: 'Open the example' })).not.toBeInTheDocument();
  });
});
