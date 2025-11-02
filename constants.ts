import type { Pet, Clinic, Appointment, Prescription, ShopItem, Address } from './types';

export const MOCK_PETS: Pet[] = [
  {
    id: 1,
    name: 'Buddy',
    breed: 'Golden Retriever',
    age: 5,
    imageUrl: 'https://i.imgur.com/0cONY5P.jpeg$0',
    history: ['Annual vaccination (2023)', 'Flea and tick prevention (Monthly)', 'Minor paw injury (2022)'],
  },
  {
    id: 2,
    name: 'Lucy',
    breed: 'Siamese Cat',
    age: 3,
    imageUrl: 'https://i.imgur.com/hKe64uW.jpeg$0',
    history: ['Spayed (2022)', 'Annual check-up (2023)', 'Dental cleaning (2023)'],
  },
];

export const MOCK_CLINICS: Clinic[] = [
  {
    id: 1,
    name: 'Happy Paws Veterinary Clinic',
    address: '123 Animal Lane, Petville',
    rating: 4.8,
    reviewCount: 258,
    distance: 2.5,
    isPinned: false,
    availableSlots: ['09:00 AM', '11:30 AM', '02:00 PM', '04:15 PM'],
    imageUrl: 'https://i.imgur.com/a7Rf7hD.jpeg$0',
    doctors: [
        { id: 101, name: 'Dr. Emily Carter' },
        { id: 102, name: 'Dr. John Miller' },
    ]
  },
  {
    id: 2,
    name: 'The Furry Friends Hospital',
    address: '456 Woof Street, Dogtown',
    rating: 4.9,
    reviewCount: 412,
    distance: 1.2,
    isPinned: true,
    availableSlots: ['10:00 AM', '10:30 AM', '03:00 PM'],
    imageUrl: 'https://i.imgur.com/B5mZ8Yb.jpeg$0',
    doctors: [
        { id: 201, name: 'Dr. Sarah Davis' },
        { id: 202, name: 'Dr. Michael Chen' },
    ]
  },
  {
    id: 3,
    name: 'Critter Care Center',
    address: '789 Meow Avenue, Catberg',
    rating: 4.7,
    reviewCount: 189,
    distance: 5.8,
    isPinned: false,
    availableSlots: ['09:30 AM', '12:00 PM', '01:30 PM', '05:00 PM'],
    imageUrl: 'https://i.imgur.com/oKsHqIp.jpeg',
    doctors: [
        { id: 301, name: 'Dr. Jessica Wilson' },
    ]
  },
];

export const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: 1,
    clinic: MOCK_CLINICS[0],
    pet: MOCK_PETS[0],
    date: '2024-08-15',
    time: '02:00 PM',
    reason: 'Annual check-up and vaccination.',
    status: 'upcoming',
    type: 'in-person',
    doctorId: 101,
  },
  {
    id: 3,
    clinic: MOCK_CLINICS[2],
    pet: MOCK_PETS[1],
    date: '2024-08-22',
    time: '09:30 AM',
    reason: 'Follow-up consultation.',
    status: 'upcoming',
    type: 'video',
    doctorId: 301,
  },
  {
    id: 2,
    clinic: MOCK_CLINICS[1],
    pet: MOCK_PETS[1],
    date: '2024-06-20',
    time: '10:30 AM',
    reason: 'Dental cleaning.',
    status: 'past',
    type: 'in-person',
    doctorId: 201,
  },
];

export const MOCK_PRESCRIPTIONS: Prescription[] = [
    {
        id: 1,
        medication: 'Heartworm Prevention Chewable',
        dosage: '1 tablet monthly',
        instructions: 'Give with food. For Buddy.',
        appointmentId: 2,
        itemId: 101,
        quantity: 1,
    },
    {
        id: 2,
        medication: 'Antibiotic Ear Drops',
        dosage: '3 drops in left ear, twice daily',
        instructions: 'For Lucy. Complete the full 7-day course.',
        appointmentId: 2,
        itemId: 102,
        quantity: 1,
    }
];

export const MOCK_SHOP_ITEMS: ShopItem[] = [
    // Medicines
    { id: 101, name: 'Heartworm Prevention Chewable', description: 'Monthly chewable tablets to prevent heartworm disease.', price: 25.99, imageUrl: 'https://source.unsplash.com/400x400/?medicine,pet', category: 'Medicine' },
    { id: 102, name: 'Antibiotic Ear Drops', description: 'For treatment of bacterial ear infections in cats and dogs.', price: 15.50, imageUrl: 'https://source.unsplash.com/400x400/?ear-drops', category: 'Medicine' },
    { id: 103, name: 'Flea & Tick Collar', description: '8-month protection against fleas and ticks.', price: 45.00, imageUrl: 'https://source.unsplash.com/400x400/?flea-collar', category: 'Medicine' },

    // Food
    { id: 201, name: 'Premium Dry Dog Food', description: 'Grain-free salmon and sweet potato recipe for adult dogs.', price: 55.99, imageUrl: 'https://source.unsplash.com/400x400/?dog-food', category: 'Food' },
    { id: 202, name: 'Wet Cat Food Variety Pack', description: 'Pate style, real chicken and fish recipes.', price: 22.00, imageUrl: 'https://source.unsplash.com/400x400/?cat-food', category: 'Food' },
    { id: 203, name: 'Dental Health Dog Treats', description: 'Clinically proven to reduce plaque and tartar buildup.', price: 12.99, imageUrl: 'https://source.unsplash.com/400x400/?dog-treats', category: 'Food' },

    // Accessories
    { id: 301, name: 'Durable Chew Toy', description: 'For aggressive chewers, non-toxic rubber.', price: 14.99, imageUrl: 'https://source.unsplash.com/400x400/?dog-toy', category: 'Accessory' },
    { id: 302, name: 'Cozy Pet Bed', description: 'Orthopedic memory foam, machine washable cover.', price: 49.99, imageUrl: 'https://source.unsplash.com/400x400/?pet-bed', category: 'Accessory' },
    { id: 303, name: 'Reflective Dog Leash', description: '6-foot nylon leash with padded handle for comfort.', price: 18.00, imageUrl: 'https://source.unsplash.com/400x400/?dog-leash', category: 'Accessory' },

    // Grooming
    { id: 401, name: 'Pet Grooming Brush', description: 'Reduces shedding by up to 95%. For both dogs and cats.', price: 24.50, imageUrl: 'https://source.unsplash.com/400x400/?pet-brush', category: 'Grooming' },
    { id: 402, name: 'Oatmeal Pet Shampoo', description: 'Soothing formula for dry, itchy skin. Soap-free.', price: 16.99, imageUrl: 'https://source.unsplash.com/400x400/?pet-shampoo', category: 'Grooming' },
    { id: 403, name: 'Heavy-Duty Nail Clippers', description: 'With safety guard to prevent over-cutting.', price: 13.99, imageUrl: 'https://source.unsplash.com/400x400/?nail-clippers,pet', category: 'Grooming' },
];

export const MOCK_ADDRESSES: Address[] = [
    { id: 1, label: 'Home', street: '123 Sunshine Avenue', city: 'Petville', zip: '12345' },
    { id: 2, label: 'Work', street: '456 Business Park Rd', city: 'Metropolis', zip: '67890' },
];

export const NAV_ITEMS = [
    { name: 'Home', icon: 'HomeIcon' },
    { name: 'Appointments', icon: 'CalendarIcon' },
    { name: 'My Pets', icon: 'HeartIcon' },
    { name: 'Shop', icon: 'ShoppingBagIcon' },
] as const;

export type NavItemName = (typeof NAV_ITEMS)[number]['name'];