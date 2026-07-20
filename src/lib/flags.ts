const CODES: Record<string, string> = {
  argentina: "ar", france: "fr", brazil: "br", germany: "de", spain: "es",
  portugal: "pt", netherlands: "nl", belgium: "be", italy: "it", croatia: "hr",
  england: "gb-eng", scotland: "gb-sct", wales: "gb-wls", ireland: "ie",
  "republic of ireland": "ie", switzerland: "ch", austria: "at", poland: "pl",
  ukraine: "ua", serbia: "rs", denmark: "dk", sweden: "se", norway: "no",
  finland: "fi", czechia: "cz", "czech republic": "cz", slovakia: "sk",
  slovenia: "si", hungary: "hu", romania: "ro", greece: "gr", turkey: "tr",
  turkiye: "tr", "türkiye": "tr", usa: "us", "united states": "us",
  mexico: "mx", canada: "ca", "costa rica": "cr", panama: "pa", honduras: "hn",
  jamaica: "jm", haiti: "ht", curacao: "cw", "curaçao": "cw", uruguay: "uy",
  colombia: "co", ecuador: "ec", paraguay: "py", peru: "pe", chile: "cl",
  bolivia: "bo", venezuela: "ve", japan: "jp", "korea republic": "kr",
  "south korea": "kr", "korea dpr": "kp", china: "cn", "china pr": "cn",
  australia: "au", "new zealand": "nz", iran: "ir", "ir iran": "ir",
  "saudi arabia": "sa", qatar: "qa", "united arab emirates": "ae", uae: "ae",
  iraq: "iq", jordan: "jo", uzbekistan: "uz", morocco: "ma", senegal: "sn",
  tunisia: "tn", algeria: "dz", egypt: "eg", ghana: "gh",
  "ivory coast": "ci", "cote d'ivoire": "ci", "côte d'ivoire": "ci",
  cameroon: "cm", nigeria: "ng", "south africa": "za", "cape verde": "cv",
  "cabo verde": "cv", mali: "ml", "burkina faso": "bf", "dr congo": "cd",
  "congo dr": "cd", zambia: "zm", angola: "ao", gabon: "ga", guinea: "gn",
  "el salvador": "sv", guatemala: "gt", "trinidad and tobago": "tt",
  suriname: "sr", bahrain: "bh", kuwait: "kw", oman: "om", lebanon: "lb",
  georgia: "ge", albania: "al", "north macedonia": "mk",
  "bosnia and herzegovina": "ba", montenegro: "me", kosovo: "xk",
  bulgaria: "bg", iceland: "is", russia: "ru", israel: "il",
};

export function flagCode(teamName: string): string | null {
  return CODES[teamName.trim().toLowerCase()] ?? null;
}

export function flagUrl(teamName: string): string | null {
  const code = flagCode(teamName);
  return code ? `https://flagcdn.com/h24/${code}.png` : null;
}
