window.GC_PLACES = [
  {
    id: 1, name: "Osteria dell'Angelo", category: "Trattoria", neighborhood: "Prati",
    emoji: "🍝", bgColor: "#FFF7ED",
    description: "La trattoria favorita de los argentinos en Roma. Menú del mediodía a €12. Reservá con GCPass y el descuento es automático.",
    distance: "1.2 km",
    offer: { text: "10% de descuento en almuerzo y cena", badge: "🎫 10% con GCPass" },
    plan: "partner", active: true,
    stats: { views: 247, going: 43, clicks: 18, groups: 6 }
  },
  {
    id: 2, name: "Freni e Frizioni", category: "Aperitivo bar", neighborhood: "Trastevere",
    emoji: "🍹", bgColor: "#EFF6FF",
    description: "El punto de encuentro de la comunidad GC. Aperitivo buffet incluido de 18 a 21hs. Mostrá el pass, entrás directo.",
    distance: "0.8 km",
    offer: { text: "Copa gratis en hora feliz (18-21hs)", badge: "🎫 Copa gratis en hora feliz" },
    plan: "premium", active: true,
    stats: { views: 312, going: 67, clicks: 45, groups: 9 }
  },
  {
    id: 3, name: "Caffè San Calisto", category: "Bar histórico", neighborhood: "Trastevere",
    emoji: "☕", bgColor: "#F0FDF4",
    description: "El bar más auténtico de Trastevere. Sin pretensiones, con historia. El café más barato del barrio con tu GCPass.",
    distance: "0.5 km",
    offer: { text: "Espresso a €1 con GCPass", badge: "🎫 Espresso a €1" },
    plan: "free", active: true,
    stats: { views: 89, going: 12, clicks: 7, groups: 1 }
  },
  {
    id: 4, name: "Ma Che Siete Venuti", category: "Craft beer bar", neighborhood: "Testaccio",
    emoji: "🍺", bgColor: "#F5F3FF",
    description: "El mejor local de cervezas artesanales de Roma. Los miércoles con GCPass llevan 2 por el precio de 1.",
    distance: "2.1 km",
    offer: { text: "2x1 los miércoles con GCPass", badge: "🎫 2x1 miércoles" },
    plan: "partner", active: true,
    stats: { views: 178, going: 34, clicks: 22, groups: 4 }
  },
  {
    id: 5, name: "Pizzarium Bonci", category: "Pizza al taglio", neighborhood: "Prati",
    emoji: "🍕", bgColor: "#FFF0F0",
    description: "La pizza al taglio más famosa de Roma. Gabriele Bonci. Con el GCPass te dan una porción extra en tu pedido.",
    distance: "1.5 km",
    offer: { text: "Porción extra gratis con GCPass", badge: "🎫 Porción extra gratis" },
    plan: "partner", active: true,
    stats: { views: 201, going: 28, clicks: 31, groups: 3 }
  },
  {
    id: 6, name: "Nonna Betta", category: "Cucina ebraica", neighborhood: "Ghetto",
    emoji: "🫕", bgColor: "#FEF3C7",
    description: "La cocina judeo-romana más auténtica de Roma. Carciofi alla giudia que no olvidarás.",
    distance: "1.8 km",
    offer: { text: "Postre gratis con menú completo", badge: "🎫 Postre gratis" },
    plan: "partner", active: true,
    stats: { views: 134, going: 19, clicks: 14, groups: 2 }
  }
];

window.GC_EVENTS = [
  { id: 1, name: "Aperitivo GC", emoji: "🍹", placeId: 2, displayDate: "Sáb 1 Mar", time: "19:00", price: "€8 copa incl.", going: 23, week: "this" },
  { id: 2, name: "Brunch Argentino", emoji: "🍕", placeId: 1, displayDate: "Dom 2 Mar", time: "13:00", price: "€15 menú completo", going: 11, week: "this" },
  { id: 3, name: "Noche Latina", emoji: "🎉", placeId: 4, displayDate: "Vie 7 Mar", time: "22:00", price: "Entrada libre", going: 41, week: "this" },
  { id: 4, name: "Cata de Pizzas", emoji: "🍕", placeId: 5, displayDate: "Sáb 15 Mar", time: "19:30", price: "€12 incl. 4 porciones", going: 15, week: "month" },
  { id: 5, name: "Tarde de Craft Beer", emoji: "🍺", placeId: 4, displayDate: "Dom 22 Mar", time: "17:00", price: "€10 · 3 cervezas", going: 8, week: "month" }
];
