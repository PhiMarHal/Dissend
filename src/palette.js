// Three inks on paper: beige, vermilion red, black.
export const P = {
  paper: '#EBE1CE',
  paperLight: '#F6F0E4',
  paperDark: '#D5C5A8',
  sand: '#B9A27E',
  red: '#D4271E',
  redDeep: '#8A130F',
  redHot: '#F04A2C',
  ink: '#131010',
  char: '#2C2522',
};

// Named colour roles for a scene; `bg` fills the sky, `fg` is the main ink,
// `ac` the accent. Swapping roles is how sections flip.
export const ROLES = {
  paper: { bg: P.paper, fg: P.ink, ac: P.red, soft: P.paperDark },
  red: { bg: P.red, fg: P.ink, ac: P.paperLight, soft: P.redDeep },
  redLight: { bg: P.red, fg: P.paperLight, ac: P.ink, soft: P.redDeep },
  ink: { bg: P.ink, fg: P.paper, ac: P.red, soft: P.char },
  inkRed: { bg: P.ink, fg: P.red, ac: P.paper, soft: P.char },
};
