export interface Pet {
  id: number;
  name: string;
  breed: string;
  age: number;
  imageUrl: string;
  history: string[];
}

export interface Doctor {
    id: number;
    name: string;
}

export interface Clinic {
  id: number;
  name: string;
  address: string;
  rating: number;
  reviewCount: number;
  distance: number; // in km
  isPinned?: boolean;
  availableSlots: string[];
  imageUrl: string;
  doctors: Doctor[];
}

export interface Appointment {
  id: number;
  clinic: Clinic;
  pet: Pet;
  date: string;
  time: string;
  reason: string;
  status: 'upcoming' | 'past' | 'cancelled';
  type: 'in-person' | 'video';
  doctorId: number;
}

export interface Prescription {
  id: number;
  medication: string;
  dosage: string;
  instructions: string;
  appointmentId: number;
  itemId: number; // Links to ShopItem ID
  quantity: number;
}

export interface ShopItem {
    id: number;
    name: string;
    description: string;
    price: number;
    imageUrl: string;
    category: 'Food' | 'Accessory' | 'Grooming' | 'Medicine';
}

export interface CartItem extends ShopItem {
    quantity: number;
}

export interface Address {
  id: number;
  label: string;
  street: string;
  city: string;
  zip: string;
}

export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}