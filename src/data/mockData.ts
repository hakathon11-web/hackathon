
import { 
  Gamepad2, 
  Monitor, 
  Headphones, 
  Zap, 
  Target,
  Coffee,
  Users,
  Trophy
} from "lucide-react";

export const popularVenues = [
  {
    id: "1",
    name: "GameZone Central",
    location: "Downtown District",
    rating: 4.8,

    price: "$15",
    image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=300&fit=crop",
    amenities: ["WiFi", "Parking", "Food", "AC"],
    description: "Premium PC gaming lounge with high-end specs and comfortable seating.",
    coordinates: { lat: 40.7589, lng: -73.9851 },
    services: [
      { name: "Gaming PC (RTX 4080)", price: 15, duration: "per hour" },
      { name: "Private Room", price: 45, duration: "per hour" },
      { name: "Tournament Setup", price: 25, duration: "per hour" }
    ],
    images: [
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&h=600&fit=crop"
    ],

  },
  {
    id: "2",
    name: "VR World",
    location: "Tech Park",
    rating: 4.9,

    price: "$25",
    image: "https://images.unsplash.com/photo-1592478411213-6153e4ebc696?w=400&h=300&fit=crop",
    amenities: ["WiFi", "Parking", "Guide"],
    description: "Immersive VR experiences with the latest headsets and games.",
    coordinates: { lat: 40.7505, lng: -73.9934 },
    services: [
      { name: "VR Session (1 Player)", price: 25, duration: "per hour" },
      { name: "VR Party (4 Players)", price: 80, duration: "per hour" },
      { name: "VR Experience Package", price: 120, duration: "2 hours" }
    ],
    images: [
      "https://images.unsplash.com/photo-1592478411213-6153e4ebc696?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1617802690992-15d93263d3a9?w=800&h=600&fit=crop"
    ],

  },
  {
    id: "3",
    name: "Retro Palace",
    location: "Old Town",
    rating: 4.7,

    price: "$10",
    image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop",
    amenities: ["WiFi", "Snacks", "Tokens"],
    description: "Classic arcade games from the 80s and 90s in a nostalgic setting.",
    coordinates: { lat: 40.7614, lng: -73.9776 },
    services: [
      { name: "Arcade Access", price: 10, duration: "per hour" },
      { name: "Token Package (50)", price: 20, duration: "one-time" },
      { name: "Birthday Party Package", price: 150, duration: "3 hours" }
    ],
    images: [
      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop"
    ],

  },
  {
    id: "4",
    name: "Console Kings",
    location: "Gaming District",
    rating: 4.6,

    price: "$12",
    image: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400&h=300&fit=crop",
    amenities: ["WiFi", "Parking", "Food", "Drinks"],
    description: "Latest console gaming with PS5, Xbox Series X, and Nintendo Switch.",
    coordinates: { lat: 40.7648, lng: -73.9808 },
    services: [
      { name: "Console Gaming", price: 12, duration: "per hour" },
      { name: "Private Gaming Room", price: 35, duration: "per hour" },
      { name: "Tournament Entry", price: 50, duration: "one-time" }
    ],
    images: [
      "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=800&h=600&fit=crop"
    ],

  }
];
