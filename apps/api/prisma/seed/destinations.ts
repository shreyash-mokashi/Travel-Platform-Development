import type { DestinationSeed } from './catalogue';

/**
 * Demo inventory for six Indian cities. Property names, descriptions and
 * ratings are invented for this project and are not real businesses.
 */
export const DESTINATIONS: DestinationSeed[] = [
  {
    slug: 'mumbai',
    city: 'Mumbai',
    state: 'Maharashtra',
    tagline: 'Sea-facing stays, Art Deco streets and the best late-night food in India.',
    heroIndex: 10,
    priceFactor: 1.25,
    hotels: [
      {
        slug: 'marine-drive-meridian-mumbai',
        name: 'Marine Drive Meridian',
        starRating: 5,
        guestRating: 4.7,
        reviewCount: 1843,
        addressLine: '12 Netaji Subhash Chandra Bose Road',
        locality: 'Marine Lines',
        postalCode: '400020',
        latitude: 18.9432,
        longitude: 72.8231,
        shortDescription:
          'Sea-facing five star on the Queen’s Necklace with a rooftop infinity pool.',
        description:
          'Marine Drive Meridian occupies a restored Art Deco frontage directly opposite the ' +
          'promenade. Rooms on the upper floors look west across the bay, the rooftop pool is ' +
          'open until midnight, and the lobby bar pours a short but serious list of Indian ' +
          'single malts. Churchgate station is a six-minute walk, which puts the Fort district ' +
          'and the Gateway of India within easy reach without a car.',
        amenities: [
          'WIFI',
          'POOL',
          'SPA',
          'GYM',
          'RESTAURANT',
          'BAR',
          'ROOM_SERVICE',
          'BUSINESS_CENTRE',
          'AIRPORT_SHUTTLE',
        ],
        baseNightlyRupees: 11_500,
      },
      {
        slug: 'bandra-loft-house',
        name: 'Bandra Loft House',
        starRating: 4,
        guestRating: 4.5,
        reviewCount: 962,
        addressLine: '27 Hill Road, Ranwar Village',
        locality: 'Bandra West',
        postalCode: '400050',
        latitude: 19.0544,
        longitude: 72.8255,
        shortDescription:
          'Design-led loft rooms in Bandra’s Portuguese quarter, minutes from Carter Road.',
        description:
          'A converted 1930s villa in Ranwar with exposed brick, double-height loft rooms and a ' +
          'courtyard cafe that roasts its own coffee. The surrounding lanes hold most of the ' +
          'neighbourhood’s independent restaurants, and Carter Road promenade is a ten-minute ' +
          'walk for an evening by the sea.',
        amenities: [
          'WIFI',
          'GYM',
          'RESTAURANT',
          'BAR',
          'AIR_CONDITIONING',
          'PET_FRIENDLY',
          'ROOM_SERVICE',
        ],
        baseNightlyRupees: 7_200,
      },
      {
        slug: 'andheri-business-court',
        name: 'Andheri Business Court',
        starRating: 4,
        guestRating: 4.2,
        reviewCount: 1407,
        addressLine: 'Plot 44, Andheri-Kurla Road',
        locality: 'Andheri East',
        postalCode: '400059',
        latitude: 19.1136,
        longitude: 72.8697,
        shortDescription:
          'Efficient airport-corridor hotel with 24-hour shuttle and meeting floors.',
        description:
          'Built for people who fly in to work. The shuttle to both terminals runs around the ' +
          'clock, breakfast opens at 05:00, and three meeting rooms can be booked by the hour. ' +
          'Rooms are soundproofed against the arterial road and the gym stays open 24 hours.',
        amenities: [
          'WIFI',
          'GYM',
          'RESTAURANT',
          'BUSINESS_CENTRE',
          'AIRPORT_SHUTTLE',
          'PARKING',
          'AIR_CONDITIONING',
          'WHEELCHAIR_ACCESS',
        ],
        baseNightlyRupees: 5_400,
      },
      {
        slug: 'colaba-courtyard-residency',
        name: 'Colaba Courtyard Residency',
        starRating: 3,
        guestRating: 4.1,
        reviewCount: 738,
        addressLine: '9 Mandlik Marg',
        locality: 'Colaba',
        postalCode: '400001',
        latitude: 18.922,
        longitude: 72.8332,
        shortDescription:
          'Good-value rooms around a quiet courtyard, a short walk from the Gateway.',
        description:
          'A plain, well-run property on a residential lane behind the Colaba causeway. There is ' +
          'no pool and no spa, but the rooms are clean and generously sized for the price, the ' +
          'staff arrange airport cars at fair rates, and almost everything a first-time visitor ' +
          'wants to see in south Mumbai is within walking distance.',
        amenities: ['WIFI', 'RESTAURANT', 'AIR_CONDITIONING', 'ROOM_SERVICE', 'FAMILY_ROOMS'],
        baseNightlyRupees: 3_600,
      },
    ],
  },
  {
    slug: 'goa',
    city: 'Goa',
    state: 'Goa',
    tagline: 'Beach shacks in the south, river forts in the north, susegad throughout.',
    heroIndex: 13,
    priceFactor: 1.1,
    hotels: [
      {
        slug: 'palolem-sands-resort',
        name: 'Palolem Sands Resort',
        starRating: 5,
        guestRating: 4.8,
        reviewCount: 2104,
        addressLine: 'Beach Road, Palolem',
        locality: 'Canacona',
        postalCode: '403702',
        latitude: 15.01,
        longitude: 74.0233,
        shortDescription:
          'Beachfront villas on quiet Palolem bay with a 40-metre pool and dive centre.',
        description:
          'The resort runs the length of the southern end of Palolem beach, where the bay is ' +
          'calmest. Villas open onto sand through a line of coconut palms, the pool is long ' +
          'enough to swim laps in, and the on-site dive centre runs trips to Grande Island from ' +
          'October to April. Dinner is served on the beach once the tide drops.',
        amenities: [
          'WIFI',
          'POOL',
          'SPA',
          'RESTAURANT',
          'BAR',
          'BEACH_ACCESS',
          'AIR_CONDITIONING',
          'ROOM_SERVICE',
          'FAMILY_ROOMS',
        ],
        baseNightlyRupees: 13_200,
      },
      {
        slug: 'assagao-garden-villas',
        name: 'Assagao Garden Villas',
        starRating: 4,
        guestRating: 4.6,
        reviewCount: 884,
        addressLine: 'Badem Church Road',
        locality: 'Assagao',
        postalCode: '403507',
        latitude: 15.6055,
        longitude: 73.7596,
        shortDescription:
          'Portuguese villa conversion among the banyans, ten minutes inland from Anjuna.',
        description:
          'Six suites inside a restored Indo-Portuguese house, surrounded by a garden that was ' +
          'left largely as it was found. No beach of its own, but Anjuna, Vagator and the ' +
          'Saturday night market at Arpora are all short drives, and the house restaurant has ' +
          'become a destination in its own right.',
        amenities: [
          'WIFI',
          'POOL',
          'RESTAURANT',
          'BAR',
          'PET_FRIENDLY',
          'AIR_CONDITIONING',
          'PARKING',
        ],
        baseNightlyRupees: 8_900,
      },
      {
        slug: 'candolim-beach-club-hotel',
        name: 'Candolim Beach Club Hotel',
        starRating: 4,
        guestRating: 4.3,
        reviewCount: 1659,
        addressLine: 'Fort Aguada Road',
        locality: 'Candolim',
        postalCode: '403515',
        latitude: 15.5177,
        longitude: 73.7626,
        shortDescription: 'Family-focused resort a two-minute walk from Candolim beach.',
        description:
          'A straightforward resort built around a large free-form pool, with a kids’ club in ' +
          'season and a path through the dunes to the beach. Fort Aguada is a short drive south ' +
          'and the Candolim strip has the widest choice of restaurants in north Goa.',
        amenities: [
          'WIFI',
          'POOL',
          'GYM',
          'RESTAURANT',
          'BAR',
          'BEACH_ACCESS',
          'FAMILY_ROOMS',
          'PARKING',
          'AIR_CONDITIONING',
        ],
        baseNightlyRupees: 6_400,
      },
      {
        slug: 'panjim-riverfront-inn',
        name: 'Panjim Riverfront Inn',
        starRating: 3,
        guestRating: 4.2,
        reviewCount: 611,
        addressLine: '18 Dayanand Bandodkar Marg',
        locality: 'Panjim',
        postalCode: '403001',
        latitude: 15.4989,
        longitude: 73.8278,
        shortDescription: 'Simple riverside rooms in Panjim, walking distance from Fontainhas.',
        description:
          'A small inn facing the Mandovi, a few minutes from the painted lanes of the Latin ' +
          'quarter. Rooms are modest and the pool is small, but the location suits anyone who ' +
          'would rather spend their time in Panjim’s cafes and churches than on a sunbed.',
        amenities: ['WIFI', 'POOL', 'RESTAURANT', 'AIR_CONDITIONING', 'PARKING'],
        baseNightlyRupees: 3_200,
      },
      {
        slug: 'morjim-dunes-retreat',
        name: 'Morjim Dunes Retreat',
        starRating: 4,
        guestRating: 4.4,
        reviewCount: 523,
        addressLine: 'Morjim Beach Road',
        locality: 'Morjim',
        postalCode: '403512',
        latitude: 15.6297,
        longitude: 73.732,
        shortDescription: 'Low-rise cottages behind the dunes on quiet Morjim beach.',
        description:
          'Twenty cottages set back from one of north Goa’s widest and emptiest beaches. ' +
          'Olive ridley turtles nest on this stretch between November and February, so the ' +
          'property keeps beach lighting deliberately low. Chapora river and Ashwem are nearby.',
        amenities: [
          'WIFI',
          'POOL',
          'RESTAURANT',
          'BAR',
          'BEACH_ACCESS',
          'PET_FRIENDLY',
          'AIR_CONDITIONING',
        ],
        baseNightlyRupees: 7_600,
      },
    ],
  },
  {
    slug: 'jaipur',
    city: 'Jaipur',
    state: 'Rajasthan',
    tagline: 'Pink sandstone, stepwells and haveli courtyards in the Rajasthani capital.',
    heroIndex: 21,
    priceFactor: 0.95,
    hotels: [
      {
        slug: 'amber-haveli-palace',
        name: 'Amber Haveli Palace',
        starRating: 5,
        guestRating: 4.8,
        reviewCount: 1522,
        addressLine: 'Delhi-Amer Road',
        locality: 'Amer',
        postalCode: '302028',
        latitude: 26.9855,
        longitude: 75.8513,
        shortDescription:
          'Restored haveli below Amber Fort with frescoed suites and a step-well pool.',
        description:
          'A nineteenth-century merchant’s haveli restored over seven years, with original ' +
          'frescoes left visible in the public rooms. The pool is built in the form of a ' +
          'traditional step-well, Amber Fort is a fifteen-minute walk uphill, and the kitchen ' +
          'cooks a Rajasthani thali worth planning an evening around.',
        amenities: [
          'WIFI',
          'POOL',
          'SPA',
          'RESTAURANT',
          'BAR',
          'ROOM_SERVICE',
          'PARKING',
          'AIR_CONDITIONING',
        ],
        baseNightlyRupees: 10_400,
      },
      {
        slug: 'civil-lines-garden-hotel',
        name: 'Civil Lines Garden Hotel',
        starRating: 4,
        guestRating: 4.4,
        reviewCount: 907,
        addressLine: 'C-Scheme, Sardar Patel Marg',
        locality: 'Civil Lines',
        postalCode: '302001',
        latitude: 26.9044,
        longitude: 75.7983,
        shortDescription: 'Mid-century hotel in leafy C-Scheme, close to the old city gates.',
        description:
          'A 1960s government guest house turned hotel, with wide corridors, a mature garden and ' +
          'a reliable kitchen. The walled city, Hawa Mahal and Jantar Mantar are a ten-minute ' +
          'drive, and the surrounding streets hold most of Jaipur’s better bookshops and cafes.',
        amenities: [
          'WIFI',
          'POOL',
          'GYM',
          'RESTAURANT',
          'BUSINESS_CENTRE',
          'PARKING',
          'AIR_CONDITIONING',
          'WHEELCHAIR_ACCESS',
        ],
        baseNightlyRupees: 5_600,
      },
      {
        slug: 'johari-bazaar-rooms',
        name: 'Johari Bazaar Rooms',
        starRating: 3,
        guestRating: 4.0,
        reviewCount: 442,
        addressLine: '61 Johari Bazaar',
        locality: 'Old City',
        postalCode: '302003',
        latitude: 26.9196,
        longitude: 75.8237,
        shortDescription: 'Basic rooms directly above the jewellers’ bazaar in the walled city.',
        description:
          'Rooms on the first and second floors above a working bazaar, which means noise until ' +
          'about nine in the evening and an unbeatable position for anyone who wants to be ' +
          'inside the old city. There is no pool, no gym and no lift; there is a rooftop with a ' +
          'clear view of the Hawa Mahal.',
        amenities: ['WIFI', 'RESTAURANT', 'AIR_CONDITIONING', 'FAMILY_ROOMS'],
        baseNightlyRupees: 2_400,
      },
      {
        slug: 'nahargarh-ridge-resort',
        name: 'Nahargarh Ridge Resort',
        starRating: 5,
        guestRating: 4.6,
        reviewCount: 688,
        addressLine: 'Nahargarh Fort Road',
        locality: 'Brahmpuri',
        postalCode: '302002',
        latitude: 26.9374,
        longitude: 75.8153,
        shortDescription:
          'Hillside resort above the city with sunset terraces and an Ayurvedic spa.',
        description:
          'Cut into the Aravalli ridge below Nahargarh Fort, with terraces that look down over ' +
          'the whole of the pink city. The spa works to an Ayurvedic menu and the property runs ' +
          'guided walks up to the fort before sunrise.',
        amenities: [
          'WIFI',
          'POOL',
          'SPA',
          'GYM',
          'RESTAURANT',
          'BAR',
          'ROOM_SERVICE',
          'PARKING',
          'AIRPORT_SHUTTLE',
        ],
        baseNightlyRupees: 9_800,
      },
    ],
  },
  {
    slug: 'bengaluru',
    city: 'Bengaluru',
    state: 'Karnataka',
    tagline: 'Garden city mornings, microbrewery evenings and the best weather in India.',
    heroIndex: 25,
    priceFactor: 1.15,
    hotels: [
      {
        slug: 'indiranagar-tech-suites',
        name: 'Indiranagar Tech Suites',
        starRating: 4,
        guestRating: 4.5,
        reviewCount: 1298,
        addressLine: '100 Feet Road, Indiranagar',
        locality: 'Indiranagar',
        postalCode: '560038',
        latitude: 12.9719,
        longitude: 77.6412,
        shortDescription: 'Serviced suites with kitchenettes on Indiranagar’s main strip.',
        description:
          'Built for longer stays: every suite has a kitchenette, a proper desk and fast, ' +
          'wired internet as well as Wi-Fi. The metro is two minutes away and the 12th Main ' +
          'restaurant strip is immediately below, which is either the main attraction or the ' +
          'main drawback depending on the floor.',
        amenities: [
          'WIFI',
          'GYM',
          'RESTAURANT',
          'BUSINESS_CENTRE',
          'PARKING',
          'AIR_CONDITIONING',
          'FAMILY_ROOMS',
        ],
        baseNightlyRupees: 6_800,
      },
      {
        slug: 'cubbon-park-grand',
        name: 'Cubbon Park Grand',
        starRating: 5,
        guestRating: 4.7,
        reviewCount: 1711,
        addressLine: '3 Kasturba Road',
        locality: 'Cubbon Park',
        postalCode: '560001',
        latitude: 12.9759,
        longitude: 77.5937,
        shortDescription: 'Heritage five star on the edge of Cubbon Park with a colonnaded pool.',
        description:
          'The oldest hotel in this collection, facing the park across Kasturba Road. High ' +
          'ceilings, a colonnaded pool courtyard and a tea lounge that still serves at four. ' +
          'Vidhana Soudha, the museum and the central business district are all walkable.',
        amenities: [
          'WIFI',
          'POOL',
          'SPA',
          'GYM',
          'RESTAURANT',
          'BAR',
          'ROOM_SERVICE',
          'BUSINESS_CENTRE',
          'AIRPORT_SHUTTLE',
          'WHEELCHAIR_ACCESS',
        ],
        baseNightlyRupees: 12_600,
      },
      {
        slug: 'koramangala-social-stay',
        name: 'Koramangala Social Stay',
        starRating: 3,
        guestRating: 4.2,
        reviewCount: 836,
        addressLine: '5th Block, 80 Feet Road',
        locality: 'Koramangala',
        postalCode: '560095',
        latitude: 12.9345,
        longitude: 77.6266,
        shortDescription: 'Compact rooms and co-working space in the startup district.',
        description:
          'Small rooms, a large shared workspace and a cafe that stays open until one in the ' +
          'morning. It suits people who are in Bengaluru to meet people rather than to sleep ' +
          'in. Parking is limited and there is no pool.',
        amenities: [
          'WIFI',
          'RESTAURANT',
          'BAR',
          'BUSINESS_CENTRE',
          'AIR_CONDITIONING',
          'PET_FRIENDLY',
        ],
        baseNightlyRupees: 3_900,
      },
      {
        slug: 'whitefield-lakeside-hotel',
        name: 'Whitefield Lakeside Hotel',
        starRating: 4,
        guestRating: 4.3,
        reviewCount: 1044,
        addressLine: 'ITPL Main Road',
        locality: 'Whitefield',
        postalCode: '560066',
        latitude: 12.9698,
        longitude: 77.75,
        shortDescription: 'Lakeside business hotel beside the Whitefield tech parks.',
        description:
          'Ten minutes from ITPL, overlooking Varthur lake. Conference facilities run to 200 ' +
          'people, the shuttle covers the major tech parks on a fixed schedule, and the pool ' +
          'deck is a genuinely pleasant place to end a working day.',
        amenities: [
          'WIFI',
          'POOL',
          'GYM',
          'RESTAURANT',
          'BAR',
          'BUSINESS_CENTRE',
          'PARKING',
          'AIRPORT_SHUTTLE',
          'AIR_CONDITIONING',
        ],
        baseNightlyRupees: 7_100,
      },
    ],
  },
  {
    slug: 'delhi',
    city: 'New Delhi',
    state: 'Delhi',
    tagline: 'Mughal tombs, Lutyens avenues and the deepest food culture in the country.',
    heroIndex: 32,
    priceFactor: 1.2,
    hotels: [
      {
        slug: 'lutyens-avenue-hotel',
        name: 'Lutyens Avenue Hotel',
        starRating: 5,
        guestRating: 4.7,
        reviewCount: 1986,
        addressLine: '7 Janpath',
        locality: 'Connaught Place',
        postalCode: '110001',
        latitude: 28.6238,
        longitude: 77.2186,
        shortDescription: 'Five star off Janpath, a short walk from Connaught Place and the metro.',
        description:
          'A large, formal hotel on one of the Lutyens radial roads. Two restaurants, a serious ' +
          'spa and a pool that is heated through the Delhi winter. Rajiv Chowk metro connects ' +
          'to both airport and old city lines, which makes this an unusually practical base.',
        amenities: [
          'WIFI',
          'POOL',
          'SPA',
          'GYM',
          'RESTAURANT',
          'BAR',
          'ROOM_SERVICE',
          'BUSINESS_CENTRE',
          'AIRPORT_SHUTTLE',
          'WHEELCHAIR_ACCESS',
        ],
        baseNightlyRupees: 12_900,
      },
      {
        slug: 'hauz-khas-village-house',
        name: 'Hauz Khas Village House',
        starRating: 4,
        guestRating: 4.4,
        reviewCount: 742,
        addressLine: '14 Hauz Khas Village',
        locality: 'Hauz Khas',
        postalCode: '110016',
        latitude: 28.5535,
        longitude: 77.1942,
        shortDescription: 'Boutique rooms overlooking the Hauz Khas tank and deer park.',
        description:
          'A narrow four-storey house at the quiet end of the village, with rooms facing the ' +
          'fourteenth-century reservoir. The deer park is immediately below and the village’s ' +
          'bars and galleries start about a hundred metres away, which means some weekend noise.',
        amenities: [
          'WIFI',
          'RESTAURANT',
          'BAR',
          'AIR_CONDITIONING',
          'ROOM_SERVICE',
          'PET_FRIENDLY',
        ],
        baseNightlyRupees: 6_200,
      },
      {
        slug: 'aerocity-transit-hotel',
        name: 'Aerocity Transit Hotel',
        starRating: 4,
        guestRating: 4.3,
        reviewCount: 2240,
        addressLine: 'Hospitality District, Aerocity',
        locality: 'Aerocity',
        postalCode: '110037',
        latitude: 28.552,
        longitude: 77.118,
        shortDescription: 'Eight minutes from Terminal 3, built for early departures.',
        description:
          'A practical airport hotel with soundproofed rooms, a 24-hour kitchen and a free ' +
          'shuttle every twenty minutes. Day-use rates are available for long layovers. There ' +
          'is nothing to see in Aerocity itself, which is rather the point.',
        amenities: [
          'WIFI',
          'GYM',
          'RESTAURANT',
          'BAR',
          'AIRPORT_SHUTTLE',
          'BUSINESS_CENTRE',
          'PARKING',
          'AIR_CONDITIONING',
          'WHEELCHAIR_ACCESS',
        ],
        baseNightlyRupees: 7_800,
      },
      {
        slug: 'paharganj-backpacker-lodge',
        name: 'Paharganj Traveller Lodge',
        starRating: 2,
        guestRating: 3.8,
        reviewCount: 1312,
        addressLine: '1562 Main Bazaar',
        locality: 'Paharganj',
        postalCode: '110055',
        latitude: 28.6448,
        longitude: 77.2122,
        shortDescription: 'Budget rooms opposite New Delhi railway station.',
        description:
          'Plain, cheap and extremely central. Rooms are small and the main bazaar outside is ' +
          'loud from early morning, but New Delhi station is across the road and the airport ' +
          'express is on the same concourse. Air conditioning is fitted in the upper categories ' +
          'only.',
        amenities: ['WIFI', 'RESTAURANT', 'FAMILY_ROOMS'],
        baseNightlyRupees: 1_900,
      },
    ],
  },
  {
    slug: 'pune',
    city: 'Pune',
    state: 'Maharashtra',
    tagline: 'Deccan hill air, Peshwa history and a short drive to the Sahyadri ghats.',
    heroIndex: 6,
    priceFactor: 0.9,
    hotels: [
      {
        slug: 'koregaon-park-riverside',
        name: 'Koregaon Park Riverside',
        starRating: 5,
        guestRating: 4.6,
        reviewCount: 1134,
        addressLine: 'North Main Road, Koregaon Park',
        locality: 'Koregaon Park',
        postalCode: '411001',
        latitude: 18.5362,
        longitude: 73.8939,
        shortDescription: 'Riverside five star in Pune’s greenest neighbourhood.',
        description:
          'Set back from the Mula-Mutha river on a plot of mature trees, with an outdoor pool, ' +
          'a well-regarded Italian restaurant and rooms that face either the river or the ' +
          'garden. The Koregaon Park lanes outside hold most of the city’s better cafes.',
        amenities: [
          'WIFI',
          'POOL',
          'SPA',
          'GYM',
          'RESTAURANT',
          'BAR',
          'ROOM_SERVICE',
          'PARKING',
          'AIR_CONDITIONING',
        ],
        baseNightlyRupees: 8_600,
      },
      {
        slug: 'hinjewadi-park-inn',
        name: 'Hinjewadi Park Inn',
        starRating: 4,
        guestRating: 4.2,
        reviewCount: 1489,
        addressLine: 'Phase 2, Rajiv Gandhi Infotech Park',
        locality: 'Hinjewadi',
        postalCode: '411057',
        latitude: 18.5908,
        longitude: 73.7389,
        shortDescription: 'Straightforward business hotel inside the Hinjewadi IT park.',
        description:
          'Walking distance from several of the larger campuses, with a breakfast service that ' +
          'starts at half past five and meeting rooms that can be booked at short notice. The ' +
          'evening traffic out of Hinjewadi is severe, so staying inside the park saves an hour.',
        amenities: [
          'WIFI',
          'GYM',
          'RESTAURANT',
          'BUSINESS_CENTRE',
          'PARKING',
          'AIR_CONDITIONING',
          'WHEELCHAIR_ACCESS',
        ],
        baseNightlyRupees: 4_800,
      },
      {
        slug: 'shaniwar-wada-heritage-stay',
        name: 'Shaniwar Wada Heritage Stay',
        starRating: 3,
        guestRating: 4.1,
        reviewCount: 526,
        addressLine: 'Shivaji Road, Shaniwar Peth',
        locality: 'Shaniwar Peth',
        postalCode: '411030',
        latitude: 18.5195,
        longitude: 73.8553,
        shortDescription: 'Family-run wada conversion opposite the Peshwa fort.',
        description:
          'A traditional Pune wada with rooms around two internal courtyards, run by the same ' +
          'family for three generations. Shaniwar Wada is across the road and the old city ' +
          'temples are within walking distance. No lift and no pool.',
        amenities: ['WIFI', 'RESTAURANT', 'AIR_CONDITIONING', 'FAMILY_ROOMS', 'PARKING'],
        baseNightlyRupees: 2_900,
      },
      {
        slug: 'lonavala-ghat-view-resort',
        name: 'Lonavala Ghat View Resort',
        starRating: 4,
        guestRating: 4.5,
        reviewCount: 967,
        addressLine: 'Old Mumbai-Pune Highway, Lonavala',
        locality: 'Lonavala',
        postalCode: '410401',
        latitude: 18.7546,
        longitude: 73.4062,
        shortDescription: 'Hill resort above the Sahyadri ghats, an hour from Pune.',
        description:
          'Terraced into the hillside with views down the ghat, best in the monsoon when the ' +
          'waterfalls run. There is an indoor pool for the wet months, a games room for ' +
          'families, and trailheads for Rajmachi and Lohagad within a short drive.',
        amenities: [
          'WIFI',
          'POOL',
          'SPA',
          'RESTAURANT',
          'BAR',
          'FAMILY_ROOMS',
          'PARKING',
          'PET_FRIENDLY',
          'AIR_CONDITIONING',
        ],
        baseNightlyRupees: 6_600,
      },
    ],
  },
];
