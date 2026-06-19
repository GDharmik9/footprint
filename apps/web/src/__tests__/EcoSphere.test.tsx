import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import EcoSphere from '../components/EcoSphere';

describe('EcoSphere component', () => {
  it('renders an SVG element', () => {
    const { container } = render(<EcoSphere level={1} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders level 1 sprout paths at level 1', () => {
    const { container } = render(<EcoSphere level={1} />);
    // level >= 1 renders a trunk path
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThan(2); // soil + trunk + leaf
  });

  it('renders more paths at higher levels', () => {
    const { container: c1 } = render(<EcoSphere level={1} />);
    const { container: c5 } = render(<EcoSphere level={5} />);
    const pathsL1 = c1.querySelectorAll('path').length;
    const pathsL5 = c5.querySelectorAll('path').length;
    expect(pathsL5).toBeGreaterThan(pathsL1);
  });

  it('renders the ecosphere-svg class', () => {
    const { container } = render(<EcoSphere level={1} />);
    const svg = container.querySelector('.ecosphere-svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders with level 0 without crashing', () => {
    const { container } = render(<EcoSphere level={0} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders with a very high level without crashing', () => {
    const { container } = render(<EcoSphere level={99} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
