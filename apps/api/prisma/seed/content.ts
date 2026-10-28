/** Editorial destination content seeded into MongoDB. */
export interface ContentSeed {
  destinationSlug: string;
  headline: string;
  intro: string;
  highlights: { title: string; body: string }[];
  bestTimeToVisit: string;
  neighbourhoods: { name: string; summary: string }[];
  faqs: { question: string; answer: string }[];
}

export const DESTINATION_CONTENT: ContentSeed[] = [
  {
    destinationSlug: 'mumbai',
    headline: 'Where to stay in Mumbai',
    intro:
      'Mumbai runs north to south along a narrow peninsula, so the neighbourhood you book ' +
      'decides how much of your trip you spend in traffic. South Mumbai suits first visits, ' +
      'Bandra suits food and nightlife, and Andheri suits anyone with an early flight.',
    highlights: [
      {
        title: 'Marine Drive at dusk',
        body: 'The three-kilometre promenade fills up around six; walk north from Nariman Point for the best of it.',
      },
      {
        title: 'Kala Ghoda galleries',
        body: 'A compact arts district in the Fort area, walkable from most south Mumbai hotels.',
      },
      {
        title: 'Elephanta caves',
        body: 'Boats leave the Gateway hourly; the rock-cut temples take about three hours including the crossing.',
      },
    ],
    bestTimeToVisit:
      'November to February is dry and mild. The monsoon from June to September is dramatic ' +
      'but floods low-lying roads. March to May is hot and humid.',
    neighbourhoods: [
      {
        name: 'Colaba & Fort',
        summary: 'Heritage buildings, museums and the Gateway. Best for a first visit.',
      },
      {
        name: 'Bandra West',
        summary: 'Independent restaurants, sea-facing promenades and the city’s best bars.',
      },
      {
        name: 'Andheri East',
        summary:
          'Airport corridor. Practical rather than scenic, with the widest choice of business hotels.',
      },
    ],
    faqs: [
      {
        question: 'How do I get from the airport to south Mumbai?',
        answer:
          'Allow 60 to 90 minutes by car outside peak hours, and up to two hours during them. Prepaid taxi counters operate at both terminals.',
      },
      {
        question: 'Is the local train practical for visitors?',
        answer:
          'Yes, outside the 08:00-11:00 and 17:00-21:00 peaks. Travel in the first-class carriage and avoid rush hour entirely if you have luggage.',
      },
    ],
  },
  {
    destinationSlug: 'goa',
    headline: 'North Goa or South Goa?',
    intro:
      'The two halves of Goa attract different trips. North Goa is denser, louder and better ' +
      'for restaurants, markets and nightlife. South Goa is quieter, greener and better for ' +
      'anyone whose plan is mostly a beach and a book.',
    highlights: [
      {
        title: 'Fontainhas, Panjim',
        body: 'The Latin quarter’s painted houses are best walked in the first hour after sunrise.',
      },
      {
        title: 'Saturday night market, Arpora',
        body: 'Runs from late October through April. Busiest after nine.',
      },
      {
        title: 'Dudhsagar falls',
        body: 'Reachable by jeep from Kulem. At its most impressive from July to October.',
      },
    ],
    bestTimeToVisit:
      'November to February has the best weather and the highest prices. October and March ' +
      'are quieter shoulder months. Many beach shacks close entirely from June to September.',
    neighbourhoods: [
      {
        name: 'Palolem & Canacona',
        summary: 'A calm crescent bay in the far south. Quiet after ten at night.',
      },
      {
        name: 'Assagao & Anjuna',
        summary: 'Inland villages behind the north beaches, with the best food in the state.',
      },
      {
        name: 'Candolim & Calangute',
        summary: 'The busiest stretch. Most family resorts and the widest choice of water sports.',
      },
    ],
    faqs: [
      {
        question: 'Do I need to rent a scooter?',
        answer:
          'It helps considerably in north Goa, where distances between beaches are short but taxis are expensive. Carry an international permit.',
      },
      {
        question: 'Which airport should I fly into?',
        answer:
          'Mopa (GOX) is closer to the north beaches; Dabolim (GOI) is closer to the south. Check which one your hotel transfer quotes for.',
      },
    ],
  },
  {
    destinationSlug: 'jaipur',
    headline: 'Jaipur in two or three days',
    intro:
      'Jaipur’s sights divide into the walled pink city, the forts on the ridge above it, and ' +
      'the colonial-era avenues of C-Scheme. Two full days covers the essentials; three lets ' +
      'you add Amber and a day trip.',
    highlights: [
      {
        title: 'Amber Fort at opening',
        body: 'Arrive at eight to walk the Sheesh Mahal before the coach groups.',
      },
      {
        title: 'Panna Meena ka Kund',
        body: 'A symmetrical step-well below Amber, a five-minute drive from the fort gate.',
      },
      {
        title: 'Jantar Mantar',
        body: 'The eighteenth-century observatory is more interesting with a guide; most instruments still keep accurate time.',
      },
    ],
    bestTimeToVisit:
      'October to March is comfortable, with cool evenings in December and January. April to ' +
      'June regularly exceeds 40C. The monsoon brings brief heavy rain in July and August.',
    neighbourhoods: [
      {
        name: 'Old City',
        summary: 'Inside the walls. Loud, crowded and the closest to the main bazaars.',
      },
      {
        name: 'C-Scheme & Civil Lines',
        summary: 'Wide tree-lined streets, embassies and the better independent cafes.',
      },
      {
        name: 'Amer',
        summary: 'Below the fort, fifteen minutes outside the city. Best for heritage properties.',
      },
    ],
    faqs: [
      {
        question: 'Is the composite ticket worth buying?',
        answer:
          'Yes if you plan to see Amber, Jantar Mantar, Hawa Mahal and Nahargarh. It is valid for two days from first use.',
      },
      {
        question: 'How far is Jaipur from Delhi?',
        answer:
          'About five hours by road on the expressway, or four and a half hours by Vande Bharat train.',
      },
    ],
  },
  {
    destinationSlug: 'bengaluru',
    headline: 'Staying in Bengaluru',
    intro:
      'Bengaluru sprawls, and its traffic is the worst of any city in this collection. Choose ' +
      'a neighbourhood near wherever you will actually spend your days rather than near the ' +
      'geographic centre.',
    highlights: [
      {
        title: 'Lalbagh at sunrise',
        body: 'The botanical garden opens at six; the glasshouse and the 3,000-million-year-old rock outcrop are both worth the early start.',
      },
      {
        title: 'Cubbon Park on Sundays',
        body: 'Closed to traffic, which turns 300 acres over to walkers and cyclists.',
      },
      {
        title: 'Microbreweries of Indiranagar',
        body: 'The densest concentration of independent brewing in India, mostly along 12th Main and 100 Feet Road.',
      },
    ],
    bestTimeToVisit:
      'Pleasant year round at 900 metres. October to February is driest and coolest. The ' +
      'monsoon runs June to September with short, heavy evening showers.',
    neighbourhoods: [
      {
        name: 'Indiranagar',
        summary: 'Restaurants, bars and the metro. Central and well connected.',
      },
      {
        name: 'Koramangala',
        summary: 'The startup district. Younger, cheaper and busier at night.',
      },
      {
        name: 'Whitefield',
        summary: 'Tech parks on the eastern edge. Convenient only if you work there.',
      },
    ],
    faqs: [
      {
        question: 'How bad is the traffic really?',
        answer:
          'Allow double the map estimate between 08:30-11:00 and 17:00-21:00. The Purple and Green metro lines avoid it where they go.',
      },
      {
        question: 'How long from the airport?',
        answer:
          'Kempegowda is 35 km north of the centre. Budget 60-90 minutes, more in the evening peak.',
      },
    ],
  },
  {
    destinationSlug: 'delhi',
    headline: 'Finding your way around Delhi',
    intro:
      'Delhi is really several cities layered on top of each other. New Delhi’s wide ' +
      'avenues, the Mughal core around Old Delhi, and the southern urban villages each ' +
      'reward a different kind of day.',
    highlights: [
      {
        title: 'Humayun’s Tomb',
        body: 'The template for the Taj Mahal, and far less crowded. Best in the late afternoon.',
      },
      {
        title: 'Chandni Chowk on foot',
        body: 'Start at the Red Fort and work west; the food lanes around Paranthe Wali Gali are the point.',
      },
      {
        title: 'Lodhi Art District',
        body: 'India’s first open-air public art district, walkable from Lodhi Gardens.',
      },
    ],
    bestTimeToVisit:
      'October to March is the season, though December and January bring fog that delays ' +
      'flights. Air quality is poorest from late October to January. April to June is very hot.',
    neighbourhoods: [
      {
        name: 'Connaught Place',
        summary: 'Central, on the metro, within reach of both New and Old Delhi.',
      },
      {
        name: 'Hauz Khas & South Delhi',
        summary: 'Greener and calmer, with the best bars and a fourteenth-century reservoir.',
      },
      { name: 'Aerocity', summary: 'Purely functional. Right by Terminal 3 and nothing else.' },
    ],
    faqs: [
      {
        question: 'Is the metro useful?',
        answer:
          'Very. It is clean, cheap and air conditioned, and the Airport Express reaches New Delhi station in twenty minutes.',
      },
      {
        question: 'When is air quality at its worst?',
        answer:
          'Early November through January. If you are sensitive, consider travelling in February or March instead.',
      },
    ],
  },
  {
    destinationSlug: 'pune',
    headline: 'Pune as a base',
    intro:
      'Pune sits on the Deccan plateau just east of the Western Ghats, which gives it milder ' +
      'weather than Mumbai and puts several hill stations within a two-hour drive.',
    highlights: [
      {
        title: 'Shaniwar Wada',
        body: 'The Peshwa fort in the old city. The foundations and gates survive; the palace itself burned in 1828.',
      },
      {
        title: 'Aga Khan Palace',
        body: 'Where Gandhi was interned from 1942. Quiet gardens and a small, well-kept museum.',
      },
      {
        title: 'Sahyadri trails',
        body: 'Rajmachi, Lohagad and Sinhagad are all day trips, and spectacular from July to September.',
      },
    ],
    bestTimeToVisit:
      'October to February is dry and mild. The monsoon from June to September is the best ' +
      'time for the ghats, if you do not mind rain. March to May is hot but drier than Mumbai.',
    neighbourhoods: [
      {
        name: 'Koregaon Park',
        summary: 'Tree-lined, riverside and the most pleasant part of the city to walk in.',
      },
      {
        name: 'Hinjewadi',
        summary:
          'The IT park on the western edge. Convenient for work, cut off from everything else.',
      },
      {
        name: 'Shaniwar Peth',
        summary: 'The old city. Temples, wadas and the densest street food.',
      },
    ],
    faqs: [
      {
        question: 'How do I get here from Mumbai?',
        answer:
          'Three to four hours by road on the expressway, or three and a half hours by Deccan Queen. Pune also has its own airport.',
      },
      {
        question: 'Is Lonavala worth an overnight?',
        answer: 'In the monsoon, yes. Outside it the ghats are dry and a day trip is enough.',
      },
    ],
  },
];
