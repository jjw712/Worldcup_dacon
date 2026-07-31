import type {
  DetailedPosition,
  Position,
  PreferredFoot,
  RosterPlayer,
  TeamId,
} from "./types";

type RosterSeed = readonly [
  shirtNumber: number,
  idSlug: string,
  name: string,
  position: Position,
  detailedPosition: DetailedPosition,
  club: string,
  birthYear: number,
  preferredFoot?: PreferredFoot,
];

const roster = (teamId: TeamId, seeds: readonly RosterSeed[]): RosterPlayer[] =>
  seeds.map(
    ([
      shirtNumber,
      idSlug,
      name,
      position,
      detailedPosition,
      club,
      birthYear,
      preferredFoot = "UNKNOWN",
    ]) => ({
      id: `${teamId}-${idSlug}`,
      teamId,
      name,
      shirtNumber,
      position,
      detailedPosition,
      club,
      birthYear,
      preferredFoot,
    }),
  );

/**
 * Source of truth for number, broad position, birth year and club:
 * FIFA World Cup 2026 official squad list, version 1 (19 July 2026).
 * https://fdp.fifa.org/assetspublic/ce281/pdf/SquadLists-English.pdf
 *
 * detailedPosition is a gameplay classification derived from the player's
 * commonly used role. preferredFoot remains UNKNOWN unless separately verified.
 */
export const KOREA_ROSTER_2026 = roster("KOR", [
  [1, "KIM-SG", "김승규", "GK", "GK", "FC Tokyo", 1990],
  [2, "LEE-HB", "이한범", "DF", "CB", "FC Midtjylland", 2002],
  [3, "LEE-GH", "이기혁", "MF", "DM", "Gangwon FC", 2000],
  [4, "KIM-MJ", "김민재", "DF", "CB", "FC Bayern München", 1996],
  [5, "KIM-TH", "김태현", "DF", "CB", "Kashima Antlers", 2000],
  [6, "HWANG-IB", "황인범", "MF", "CM", "Feyenoord Rotterdam", 1996],
  [7, "SON", "손흥민", "FW", "LW", "LAFC", 1992, "RIGHT"],
  [8, "PAIK-SH", "백승호", "MF", "DM", "Birmingham City FC", 1997],
  [9, "CHO-GS", "조규성", "FW", "ST", "FC Midtjylland", 1998],
  [10, "LEE-JS", "이재성", "MF", "AM", "1. FSV Mainz 05", 1992],
  [11, "HWANG-HC", "황희찬", "MF", "LW", "Wolverhampton Wanderers FC", 1996],
  [12, "SONG-BG", "송범근", "GK", "GK", "Jeonbuk Hyundai Motors FC", 1997],
  [13, "LEE-TS", "이태석", "DF", "LB", "FK Austria Wien", 2002],
  [14, "CHO-WJ", "조위제", "DF", "CB", "Jeonbuk Hyundai Motors FC", 2001],
  [15, "KIM-MH", "김문환", "DF", "RB", "Daejeon Hana Citizen FC", 1995],
  [16, "PARK-JS", "박진섭", "DF", "CB", "Zhejiang FC", 1995],
  [17, "BAE-JH", "배준호", "MF", "AM", "Stoke City FC", 2003],
  [18, "OH-HG", "오현규", "FW", "ST", "Beşiktaş JK", 2001],
  [19, "LEE-KI", "이강인", "MF", "RW", "Paris Saint-Germain", 2001],
  [20, "YANG-HJ", "양현준", "MF", "RW", "Celtic FC", 2002],
  [21, "JO-HW", "조현우", "GK", "GK", "Ulsan HD", 1991],
  [22, "SEOL-YW", "설영우", "DF", "RB", "FK Crvena Zvezda", 1998],
  [23, "CASTROP", "옌스 카스트로프", "DF", "RB", "Borussia Mönchengladbach", 2003],
  [24, "KIM-JG", "김진규", "MF", "CM", "Jeonbuk Hyundai Motors FC", 1997],
  [25, "EOM-JS", "엄지성", "MF", "LW", "Swansea City AFC", 2002],
  [26, "LEE-DG", "이동경", "MF", "AM", "Ulsan HD", 1997],
]);

export const CZECHIA_ROSTER_2026 = roster("CZE", [
  [1, "KOVAR", "Matěj Kovář", "GK", "GK", "PSV Eindhoven", 2000],
  [2, "ZIMA", "David Zima", "DF", "CB", "SK Slavia Praha", 2000],
  [3, "HOLES", "Tomáš Holeš", "DF", "CB", "SK Slavia Praha", 1993],
  [4, "HRANAC", "Robin Hranáč", "DF", "CB", "TSG Hoffenheim", 2000],
  [5, "COUFAL", "Vladimír Coufal", "DF", "RB", "TSG Hoffenheim", 1992],
  [6, "CHALOUPEK", "Štěpán Chaloupek", "DF", "CB", "SK Slavia Praha", 2003],
  [7, "KREJCI", "Ladislav Krejčí", "DF", "CB", "Wolverhampton Wanderers FC", 1999],
  [8, "DARIDA", "Vladimír Darida", "MF", "CM", "FC Hradec Králové", 1990],
  [9, "HLOZEK", "Adam Hložek", "FW", "LW", "TSG Hoffenheim", 2002],
  [10, "SCHICK", "Patrik Schick", "FW", "ST", "Bayer 04 Leverkusen", 1996],
  [11, "KUCHTA", "Jan Kuchta", "FW", "ST", "AC Sparta Praha", 1997],
  [12, "CERV", "Lukáš Červ", "MF", "CM", "FC Viktoria Plzeň", 2001],
  [13, "CHYTIL", "Mojmír Chytil", "FW", "ST", "SK Slavia Praha", 1999],
  [14, "JURASEK", "David Jurásek", "DF", "LB", "SK Slavia Praha", 2000],
  [15, "SULC", "Pavel Šulc", "FW", "AM", "Olympique Lyonnais", 2000],
  [16, "STANEK", "Jindřich Staněk", "GK", "GK", "SK Slavia Praha", 1996],
  [17, "PROVOD", "Lukáš Provod", "MF", "LW", "SK Slavia Praha", 1996],
  [18, "SADILEK", "Michal Sadílek", "MF", "CM", "SK Slavia Praha", 1999],
  [19, "CHORY", "Tomáš Chorý", "FW", "ST", "SK Slavia Praha", 1995],
  [20, "ZELENY", "Jaroslav Zelený", "DF", "LB", "AC Sparta Praha", 1992],
  [21, "DOUDERA", "David Douděra", "DF", "RB", "SK Slavia Praha", 1998],
  [22, "SOUCEK", "Tomáš Souček", "MF", "DM", "West Ham United FC", 1995],
  [23, "HORNICEK", "Lukáš Horníček", "GK", "GK", "SC Braga", 2002],
  [24, "SOJKA", "Alexandr Sojka", "MF", "CM", "FC Viktoria Plzeň", 2003],
  [25, "SOCHUREK", "Hugo Sochůrek", "MF", "AM", "AC Sparta Praha", 2008],
  [26, "VISINSKY", "Denis Višinský", "FW", "LW", "FC Viktoria Plzeň", 2003],
]);

export const MEXICO_ROSTER_2026 = roster("MEX", [
  [1, "RANGEL", "Raúl Rangel", "GK", "GK", "CD Guadalajara", 2000],
  [2, "SANCHEZ", "Jorge Sánchez", "DF", "RB", "PAOK Saloniki", 1997],
  [3, "MONTES", "César Montes", "DF", "CB", "FC Lokomotiv Moscow", 1997],
  [4, "ALVAREZ", "Edson Álvarez", "DF", "DM", "Fenerbahçe SK", 1997],
  [5, "VASQUEZ", "Johan Vásquez", "DF", "CB", "Genoa CFC", 1998],
  [6, "LIRA", "Erik Lira", "MF", "DM", "CF Cruz Azul", 2000],
  [7, "ROMO", "Luis Romo", "MF", "CM", "CD Guadalajara", 1995],
  [8, "FIDALGO", "Álvaro Fidalgo", "MF", "CM", "Real Betis", 1997],
  [9, "JIMENEZ", "Raúl Jiménez", "FW", "ST", "Fulham FC", 1991],
  [10, "VEGA", "Alexis Vega", "FW", "LW", "Deportivo Toluca FC", 1997],
  [11, "GIMENEZ", "Santiago Giménez", "FW", "ST", "AC Milan", 2001],
  [12, "ACEVEDO", "Carlos Acevedo", "GK", "GK", "Club Santos Laguna", 1996],
  [13, "OCHOA", "Guillermo Ochoa", "GK", "GK", "AEL Limassol", 1985],
  [14, "GONZALEZ", "Armando González", "FW", "ST", "CD Guadalajara", 2003],
  [15, "REYES", "Israel Reyes", "DF", "CB", "Club América", 2000],
  [16, "QUINONES", "Julián Quiñones", "FW", "LW", "Al Qadsiah FC", 1997],
  [17, "PINEDA", "Orbelín Pineda", "MF", "AM", "AEK Athens", 1996],
  [18, "VARGAS", "Obed Vargas", "MF", "CM", "Atlético de Madrid", 2005],
  [19, "MORA", "Gilberto Mora", "MF", "AM", "Club Tijuana", 2008],
  [20, "CHAVEZ-M", "Mateo Chávez", "DF", "LB", "AZ Alkmaar", 2004],
  [21, "HUERTA", "César Huerta", "FW", "LW", "RSC Anderlecht", 2000],
  [22, "MARTINEZ", "Guillermo Martínez", "FW", "ST", "Pumas UNAM", 1995],
  [23, "GALLARDO", "Jesús Gallardo", "DF", "LB", "Deportivo Toluca FC", 1994],
  [24, "CHAVEZ-L", "Luis Chávez", "MF", "CM", "FC Dynamo Moscow", 1996],
  [25, "ALVARADO", "Roberto Alvarado", "FW", "RW", "CD Guadalajara", 1998],
  [26, "GUTIERREZ", "Brian Gutiérrez", "MF", "AM", "CD Guadalajara", 2003],
]);

export const SOUTH_AFRICA_ROSTER_2026 = roster("RSA", [
  [1, "WILLIAMS", "Ronwen Williams", "GK", "GK", "Mamelodi Sundowns FC", 1992],
  [2, "MATULUDI", "Thabang Matuludi", "DF", "RB", "Polokwane City FC", 1999],
  [3, "NDAMANE", "Khulumani Ndamane", "DF", "CB", "Mamelodi Sundowns FC", 2004],
  [4, "MOKOENA", "Teboho Mokoena", "MF", "CM", "Mamelodi Sundowns FC", 1997],
  [5, "MBATHA", "Thalente Mbatha", "MF", "DM", "Orlando Pirates FC", 2000],
  [6, "MODIBA", "Aubrey Modiba", "DF", "LB", "Mamelodi Sundowns FC", 1995],
  [7, "APPOLLIS", "Oswin Appollis", "FW", "LW", "Orlando Pirates FC", 2001],
  [8, "MOREMI", "Tshepang Moremi", "FW", "RW", "Orlando Pirates FC", 2000],
  [9, "FOSTER", "Lyle Foster", "FW", "ST", "Burnley FC", 2000],
  [10, "MOFOKENG", "Relebohile Mofokeng", "FW", "LW", "Orlando Pirates FC", 2004],
  [11, "ZWANE", "Themba Zwane", "MF", "AM", "Mamelodi Sundowns FC", 1989],
  [12, "MASEKO", "Thapelo Maseko", "FW", "LW", "AEL Limassol", 2003],
  [13, "SITHOLE", "Sphephelo Sithole", "MF", "CM", "CD Tondela", 1999],
  [14, "MBOKAZI", "Mbekezeli Mbokazi", "DF", "CB", "Chicago Fire FC", 2005],
  [15, "RAYNERS", "Iqraam Rayners", "FW", "ST", "Mamelodi Sundowns FC", 1995],
  [16, "CHAINE", "Sipho Chaine", "GK", "GK", "Orlando Pirates FC", 1996],
  [17, "MAKGOPA", "Evidence Makgopa", "FW", "ST", "Orlando Pirates FC", 2000],
  [18, "KABINI", "Samukele Kabini", "DF", "LB", "Molde FK", 2004],
  [19, "SIBISI", "Nkosinathi Sibisi", "DF", "CB", "Orlando Pirates FC", 1995],
  [20, "MUDAU", "Khuliso Mudau", "DF", "RB", "Mamelodi Sundowns FC", 1995],
  [21, "OKON", "Ime Okon", "DF", "CB", "Hannover 96", 2004],
  [22, "GOSS", "Ricardo Goss", "GK", "GK", "Siwelele FC", 1994],
  [23, "ADAMS", "Jayden Adams", "MF", "CM", "FIFA 공식 명단 미기재", 2001],
  [24, "MAKHANYA", "Olwethu Makhanya", "DF", "CB", "Philadelphia Union", 2004],
  [25, "SEBELEBELE", "Kamogelo Sebelebele", "FW", "RW", "Orlando Pirates FC", 2002],
  [26, "CROSS", "Bradley Cross", "DF", "CB", "Kaizer Chiefs FC", 2001],
]);

export const GROUP_A_ROSTERS_2026: Record<TeamId, RosterPlayer[]> = {
  KOR: KOREA_ROSTER_2026,
  CZE: CZECHIA_ROSTER_2026,
  MEX: MEXICO_ROSTER_2026,
  RSA: SOUTH_AFRICA_ROSTER_2026,
};
