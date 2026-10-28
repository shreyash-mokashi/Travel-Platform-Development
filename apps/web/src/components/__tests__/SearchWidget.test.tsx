import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { addDays, todayIso } from '@voyago/shared';
import type { Destination } from '@voyago/shared';
import { SearchWidget } from '../search/SearchWidget';

const pushMock = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

const DESTINATIONS: Destination[] = [
  {
    id: 'd1',
    slug: 'goa',
    city: 'Goa',
    state: 'Goa',
    country: 'India',
    tagline: 'Beaches',
    heroImageUrl: 'https://example.test/goa.jpg',
    hotelCount: 5,
  },
  {
    id: 'd2',
    slug: 'mumbai',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    tagline: 'City',
    heroImageUrl: 'https://example.test/mumbai.jpg',
    hotelCount: 4,
  },
];

const defaults = {
  destination: '',
  checkIn: addDays(todayIso(), 10),
  checkOut: addDays(todayIso(), 12),
  rooms: 1,
  adults: 2,
  children: 0,
};

function renderWidget(overrides: Partial<typeof defaults> = {}) {
  return render(
    <SearchWidget destinations={DESTINATIONS} defaults={{ ...defaults, ...overrides }} />,
  );
}

beforeEach(() => pushMock.mockClear());

describe('SearchWidget validation', () => {
  it('blocks submission and explains why when no destination is chosen', async () => {
    renderWidget();
    await userEvent.click(screen.getByTestId('search-submit'));

    expect(await screen.findByText('Choose where you want to stay.')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('marks the destination field invalid for assistive technology', async () => {
    renderWidget();
    await userEvent.click(screen.getByTestId('search-submit'));

    expect(screen.getByTestId('destination-input')).toHaveAttribute('aria-invalid', 'true');
  });

  it('rejects a check-out that is not after check-in', async () => {
    const sameDay = addDays(todayIso(), 10);
    renderWidget({ destination: 'goa', checkIn: sameDay, checkOut: sameDay });

    fireEvent.change(screen.getByTestId('checkout-input'), { target: { value: sameDay } });
    await userEvent.click(screen.getByTestId('search-submit'));

    expect(await screen.findByText('Check-out must be after check-in.')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('rejects a stay longer than the supported maximum', async () => {
    const checkIn = addDays(todayIso(), 10);
    renderWidget({ destination: 'goa', checkIn });

    fireEvent.change(screen.getByTestId('checkout-input'), {
      target: { value: addDays(checkIn, 45) },
    });
    await userEvent.click(screen.getByTestId('search-submit'));

    expect(await screen.findByText(/limited to 30 nights/i)).toBeInTheDocument();
  });

  it('pushes a URL-backed search when the form is valid', async () => {
    renderWidget({ destination: 'goa' });
    await userEvent.click(screen.getByTestId('search-submit'));

    expect(pushMock).toHaveBeenCalledTimes(1);
    const url = pushMock.mock.calls[0][0] as string;
    expect(url.startsWith('/hotels?')).toBe(true);

    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.get('destination')).toBe('goa');
    expect(params.get('rooms')).toBe('1');
    expect(params.get('adults')).toBe('2');
  });

  it('pushes check-out forward when check-in moves past it', () => {
    const checkIn = addDays(todayIso(), 10);
    renderWidget({ destination: 'goa', checkIn, checkOut: addDays(checkIn, 1) });

    const laterCheckIn = addDays(checkIn, 5);
    fireEvent.change(screen.getByTestId('checkin-input'), { target: { value: laterCheckIn } });

    expect(screen.getByTestId('checkout-input')).toHaveValue(addDays(laterCheckIn, 1));
  });
});

describe('DestinationAutocomplete', () => {
  it('suggests matching destinations as the user types', async () => {
    renderWidget();
    await userEvent.type(screen.getByTestId('destination-input'), 'mum');

    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).getByText('Mumbai')).toBeInTheDocument();
    expect(within(listbox).queryByText('Goa')).not.toBeInTheDocument();
  });

  it('submits the slug rather than the typed label', async () => {
    renderWidget();
    await userEvent.type(screen.getByTestId('destination-input'), 'mum');
    await userEvent.click(await screen.findByTestId('destination-option-mumbai'));
    await userEvent.click(screen.getByTestId('search-submit'));

    const url = pushMock.mock.calls[0][0] as string;
    expect(new URLSearchParams(url.split('?')[1]).get('destination')).toBe('mumbai');
  });

  it('is navigable by keyboard', async () => {
    renderWidget();
    const input = screen.getByTestId('destination-input');
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowDown}{Enter}');

    expect(input).toHaveValue('Goa, Goa');
  });

  it('shows an empty state rather than crashing with no matches', async () => {
    renderWidget();
    await userEvent.type(screen.getByTestId('destination-input'), 'zzzz');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});

describe('OccupancyPicker', () => {
  it('summarises the current occupancy', () => {
    renderWidget({ rooms: 2, adults: 3, children: 1 });
    expect(screen.getByTestId('occupancy-trigger')).toHaveTextContent(
      '2 rooms · 3 adults · 1 child',
    );
  });

  it('increments adults and carries the value into the search', async () => {
    renderWidget({ destination: 'goa' });
    await userEvent.click(screen.getByTestId('occupancy-trigger'));
    await userEvent.click(screen.getByLabelText('Increase Adults'));

    expect(screen.getByTestId('occupancy-adults')).toHaveTextContent('3');

    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    await userEvent.click(screen.getByTestId('search-submit'));

    const url = pushMock.mock.calls[0][0] as string;
    expect(new URLSearchParams(url.split('?')[1]).get('adults')).toBe('3');
  });

  it('will not drop below one room or one adult', async () => {
    renderWidget();
    await userEvent.click(screen.getByTestId('occupancy-trigger'));

    expect(screen.getByLabelText('Decrease Rooms')).toBeDisabled();
    await userEvent.click(screen.getByLabelText('Decrease Adults'));
    expect(screen.getByTestId('occupancy-adults')).toHaveTextContent('1');
    expect(screen.getByLabelText('Decrease Adults')).toBeDisabled();
  });

  it('reduces occupancy when the room count shrinks below it', async () => {
    renderWidget({ rooms: 2, adults: 8, children: 0 });
    await userEvent.click(screen.getByTestId('occupancy-trigger'));
    await userEvent.click(screen.getByLabelText('Decrease Rooms'));

    expect(screen.getByTestId('occupancy-rooms')).toHaveTextContent('1');
    // One room cannot hold eight adults.
    expect(screen.getByTestId('occupancy-adults')).toHaveTextContent('4');
  });
});
