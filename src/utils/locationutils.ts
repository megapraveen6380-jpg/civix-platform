export function getHumanFallbackAddress(lat: number, lng: number): string {
  const cities = [
    {
      name: "Coimbatore",
      lat: 11.0168,
      lng: 76.9558,
      streets: ["Avinashi Road", "Sathy Road", "NSR Road", "Trichy Road", "DB Road", "Cross Cut Road", "Maruthamalai Road", "Saravanampatti Link Road", "Palakkad Road"],
      localities: ["Peelamedu", "Gandhipuram", "RS Puram", "Saibaba Colony", "Saravanampatti", "Ramanathapuram", "Singanallur", "Kovaipudur"]
    },
    {
      name: "Chennai",
      lat: 12.9716,
      lng: 80.2425,
      streets: ["OMR Expressway", "GST Road", "Mount Road", "Velachery Main Road", "Taramani Link Road", "Arcot Road", "Poonamallee High Road", "MG Road", "East Coast Road"],
      localities: ["Taramani", "Adyar", "Velachery", "Guindy", "Thiruvanmiyur", "Pallikaranai", "Sholinganallur", "Mylapore", "Nungambakkam", "Tambaram"]
    },
    {
      name: "Bangalore",
      lat: 12.9716,
      lng: 77.5946,
      streets: ["100 Feet Road", "MG Road", "Outer Ring Road", "Hosur Road", "Bannerghatta Main Road", "Sarjapur Road", "Whitefield Main Road", "Residency Road"],
      localities: ["Koramangala", "Indiranagar", "HSR Layout", "Jayanagar", "Whitefield", "Electronic City", "Marathahalli", "BTM Layout", "Malleshwaram"]
    },
    {
      name: "Mumbai",
      lat: 19.0760,
      lng: 72.8777,
      streets: ["Linking Road", "SV Road", "LBS Marg", "Western Express Highway", "Senapati Bapat Marg", "Marine Drive", "CST Road", "Andheri-Kurla Road"],
      localities: ["Andheri West", "Bandra West", "Colaba", "Juhu", "Powai", "Worli", "Dadar", "Ghatkopar", "Borivali"]
    },
    {
      name: "Delhi",
      lat: 28.6139,
      lng: 77.2090,
      streets: ["Janpath Road", "Barakhamba Road", "Ring Road", "Mall Road", "Connaught Circus", "Pusa Road", "Lodhi Road", "Netaji Subhash Marg"],
      localities: ["Connaught Place", "Karol Bagh", "Saket", "Vasant Kunj", "Rajouri Garden", "Chanakyapuri", "Dwarka", "Greater Kailash", "Lajpat Nagar"]
    }
  ];

  // Find the closest city using simple distance
  let closestCity = cities[1]; // default Chennai
  let minCityDist = Math.hypot(lat - closestCity.lat, lng - closestCity.lng);

  for (const city of cities) {
    const dist = Math.hypot(lat - city.lat, lng - city.lng);
    if (dist < minCityDist) {
      minCityDist = dist;
      closestCity = city;
    }
  }

  // Generate a street and locality pseudo-randomly but deterministically based on the coordinates
  const latFactor = Math.abs(Math.sin(lat * 1000));
  const lngFactor = Math.abs(Math.cos(lng * 1000));

  const streetIdx = Math.floor(latFactor * closestCity.streets.length) % closestCity.streets.length;
  const localityIdx = Math.floor(lngFactor * closestCity.localities.length) % closestCity.localities.length;

  const street = closestCity.streets[streetIdx];
  const locality = closestCity.localities[localityIdx];

  return `${street}, Near ${locality}, ${closestCity.name}`;
}
