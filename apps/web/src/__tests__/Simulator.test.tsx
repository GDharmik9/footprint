import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Simulator from '../components/Simulator';

describe('Simulator component', () => {
  it('renders simulator groups with provided impacts', () => {
    const setSimHousing = vi.fn();
    const setSimTransport = vi.fn();
    const setSimDiet = vi.fn();

    render(
      <Simulator
        simHousing="standard"
        setSimHousing={setSimHousing}
        simTransport="gas_car"
        setSimTransport={setSimTransport}
        simDiet="balanced"
        setSimDiet={setSimDiet}
        housingImpact={2.5}
        transportImpact={3.1}
        foodImpact={1.8}
      />
    );

    expect(screen.getByText(/2.5 Tons\/Yr/i)).toBeInTheDocument();
    expect(screen.getByText(/3.1 Tons\/Yr/i)).toBeInTheDocument();
    expect(screen.getByText(/1.8 Tons\/Yr/i)).toBeInTheDocument();
  });

  it('triggers setSimHousing when housing option is clicked', async () => {
    const setSimHousing = vi.fn();
    render(
      <Simulator
        simHousing="standard"
        setSimHousing={setSimHousing}
        simTransport="gas_car"
        setSimTransport={vi.fn()}
        simDiet="balanced"
        setSimDiet={vi.fn()}
        housingImpact={2.5}
        transportImpact={3.1}
        foodImpact={1.8}
      />
    );

    await userEvent.click(screen.getByText(/Smart Nest/i));
    expect(setSimHousing).toHaveBeenCalledWith('smart_thermostat');

    await userEvent.click(screen.getByText(/Solar Roof/i));
    expect(setSimHousing).toHaveBeenCalledWith('solar');

    await userEvent.click(screen.getByText(/Standard Grid/i));
    expect(setSimHousing).toHaveBeenCalledWith('standard');
  });

  it('triggers setSimTransport when transport option is clicked', async () => {
    const setSimTransport = vi.fn();
    render(
      <Simulator
        simHousing="standard"
        setSimHousing={vi.fn()}
        simTransport="gas_car"
        setSimTransport={setSimTransport}
        simDiet="balanced"
        setSimDiet={vi.fn()}
        housingImpact={2.5}
        transportImpact={3.1}
        foodImpact={1.8}
      />
    );

    await userEvent.click(screen.getByText(/Hybrid\/EV/i));
    expect(setSimTransport).toHaveBeenCalledWith('hybrid');

    await userEvent.click(screen.getByText(/Drive SUV/i));
    expect(setSimTransport).toHaveBeenCalledWith('suv');

    await userEvent.click(screen.getByText(/Sedan/i));
    expect(setSimTransport).toHaveBeenCalledWith('gas_car');

    await userEvent.click(screen.getByText(/Bike\/Transit/i));
    expect(setSimTransport).toHaveBeenCalledWith('transit');
  });

  it('triggers setSimDiet when diet option is clicked', async () => {
    const setSimDiet = vi.fn();
    render(
      <Simulator
        simHousing="standard"
        setSimHousing={vi.fn()}
        simTransport="gas_car"
        setSimTransport={vi.fn()}
        simDiet="balanced"
        setSimDiet={setSimDiet}
        housingImpact={2.5}
        transportImpact={3.1}
        foodImpact={1.8}
      />
    );

    await userEvent.click(screen.getByText(/Vegan Swap/i));
    expect(setSimDiet).toHaveBeenCalledWith('vegan');

    await userEvent.click(screen.getByText(/Meat Heavy/i));
    expect(setSimDiet).toHaveBeenCalledWith('meat');

    await userEvent.click(screen.getByText(/Poultry\/Flex/i));
    expect(setSimDiet).toHaveBeenCalledWith('balanced');
  });
});
